import { Router } from 'express';
import { metricsTracker, trackedQuery, trackedRedis } from '../metrics.js';
import { pool } from '../db.js';
import { getCache, setCache, invalidateCachePattern, isRedisReady, pingRedis } from '../redis.js';
import { performance } from 'perf_hooks';

const router = Router();

// GET /api/metrics
router.get('/', async (req, res) => {
  const ping = await pingRedis();
  res.json({
    success: true,
    redis: {
      status: isRedisReady() ? 'connected' : 'disconnected',
      pingMs: ping.pingMs,
    },
    data: metricsTracker.getSummary(),
  });
});

// POST /api/metrics/reset
router.post('/reset', (req, res) => {
  metricsTracker.reset();
  res.json({
    success: true,
    message: 'Metrics counter and history reset successfully',
  });
});

// POST /api/metrics/benchmark-cache
// Runs side-by-side comparison of Raw PostgreSQL vs. Redis Caching
router.post('/benchmark-cache', async (req, res, next) => {
  try {
    const iterations = Math.min(Math.max(parseInt(req.body.iterations || 20, 10), 5), 100);

    // Warm up Redis with fresh data
    await invalidateCachePattern('items:*');
    const warmDataQuery = await pool.query('SELECT * FROM items ORDER BY created_at DESC LIMIT 50;');
    const sampleItems = warmDataQuery.rows;
    await setCache('items:list:all', sampleItems, 60);

    // 1. Direct PostgreSQL Reads (no cache)
    const pgReadTimes = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await trackedQuery(pool, 'read', 'SELECT', 'SELECT * FROM items ORDER BY created_at DESC LIMIT 50;');
      pgReadTimes.push(performance.now() - start);
    }

    // 2. Redis Cached Reads
    const redisReadTimes = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await trackedRedis('read', 'CACHE_HIT', () => getCache('items:list:all'));
      redisReadTimes.push(performance.now() - start);
    }

    const calcAvg = (arr) => arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : 0;
    const calcMin = (arr) => arr.length ? Number(Math.min(...arr).toFixed(2)) : 0;
    const calcMax = (arr) => arr.length ? Number(Math.max(...arr).toFixed(2)) : 0;

    const avgPg = calcAvg(pgReadTimes);
    const avgRedis = calcAvg(redisReadTimes);
    const speedup = avgRedis > 0 ? Number((avgPg / avgRedis).toFixed(1)) : 1.0;

    return res.json({
      success: true,
      message: `Comparison benchmark completed (${iterations} iterations each)`,
      comparison: {
        iterations,
        speedupMultiplier: speedup,
        speedupSummary: `Redis cache is ${speedup}x faster than direct PostgreSQL queries for reads`,
        postgresql: {
          avgMs: avgPg,
          minMs: calcMin(pgReadTimes),
          maxMs: calcMax(pgReadTimes),
          allTimes: pgReadTimes.map(t => Number(t.toFixed(2))),
        },
        redis: {
          avgMs: avgRedis,
          minMs: calcMin(redisReadTimes),
          maxMs: calcMax(redisReadTimes),
          allTimes: redisReadTimes.map(t => Number(t.toFixed(2))),
        },
      },
      currentMetrics: metricsTracker.getSummary(),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/metrics/benchmark
router.post('/benchmark', async (req, res, next) => {
  try {
    const count = Math.min(Math.max(parseInt(req.body.count || 20, 10), 5), 200);
    const benchmarkStart = performance.now();

    const sampleTopics = [
      'PostgreSQL Indexing', 'Redis Memory Caching', 'Docker Container Tuning',
      'Express Routing Performance', 'Memory Cache Layer', 'Connection Pooling',
      'Cache Invalidation Pattern', 'Latency Reduction', 'Health Check Monitoring',
      'JSON Serialization Benchmark'
    ];

    const insertedIds = [];
    const writeTimes = [];
    const readTimes = [];

    // 1. Benchmark WRITES: Insert 'count' items and invalidate cache
    for (let i = 1; i <= count; i++) {
      const topic = sampleTopics[i % sampleTopics.length];
      const title = `${topic} #${Math.floor(Math.random() * 10000)}`;
      const description = `Automated benchmark workload generation batch #${i} on ${new Date().toLocaleTimeString()}`;
      const status = i % 2 === 0 ? 'completed' : 'pending';

      const insertStart = performance.now();
      const insertResult = await trackedQuery(
        pool,
        'write',
        'INSERT',
        'INSERT INTO items (title, description, status) VALUES ($1, $2, $3) RETURNING id;',
        [title, description, status]
      );
      const writeDuration = performance.now() - insertStart;
      writeTimes.push(writeDuration);
      if (insertResult.rows[0]) {
        insertedIds.push(insertResult.rows[0].id);
      }
    }

    // Invalidate Redis cache
    await trackedRedis('write', 'CACHE_DEL', () => invalidateCachePattern('items:*'));

    // 2. Initial DB Read (Cache Miss -> Store to Redis)
    const readAllStart = performance.now();
    const dbRows = await trackedQuery(pool, 'read', 'SELECT', 'SELECT * FROM items ORDER BY created_at DESC LIMIT $1;', [count]);
    readTimes.push(performance.now() - readAllStart);
    await trackedRedis('write', 'CACHE_SET', () => setCache(`items:list:all`, dbRows.rows, 60));

    // 3. Subsequent Cached Reads (Cache Hits via Redis)
    for (let r = 0; r < 5; r++) {
      const cachedStart = performance.now();
      await trackedRedis('read', 'CACHE_HIT', () => getCache('items:list:all'));
      readTimes.push(performance.now() - cachedStart);
    }

    const totalBenchmarkTime = performance.now() - benchmarkStart;

    const calcAvg = (arr) => arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : 0;
    const calcMin = (arr) => arr.length ? Number(Math.min(...arr).toFixed(2)) : 0;
    const calcMax = (arr) => arr.length ? Number(Math.max(...arr).toFixed(2)) : 0;

    return res.json({
      success: true,
      message: `Benchmark completed: ${insertedIds.length} writes and ${readTimes.length} reads (Postgres + Redis Cache)`,
      benchmarkResults: {
        totalExecutionTimeMs: Number(totalBenchmarkTime.toFixed(2)),
        writes: {
          count: writeTimes.length,
          avgMs: calcAvg(writeTimes),
          minMs: calcMin(writeTimes),
          maxMs: calcMax(writeTimes),
        },
        reads: {
          count: readTimes.length,
          avgMs: calcAvg(readTimes),
          minMs: calcMin(readTimes),
          maxMs: calcMax(readTimes),
        },
      },
      currentMetrics: metricsTracker.getSummary(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
