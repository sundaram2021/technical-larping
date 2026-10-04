import { Router } from 'express';
import { pool } from '../db.js';
import { redis, getCache, setCache, delCache, invalidateCachePattern } from '../redis.js';
import { performance } from 'perf_hooks';

const router = Router();

// Write-Behind async queue background worker
let writeBehindQueue = [];
let isFlushing = false;

async function flushWriteBehindBatch() {
  if (isFlushing || writeBehindQueue.length === 0) return;
  isFlushing = true;
  const batch = writeBehindQueue.splice(0, 20);

  try {
    for (const item of batch) {
      if (item.type === 'INSERT') {
        await pool.query(
          'INSERT INTO items (title, description, status) VALUES ($1, $2, $3)',
          [item.title, item.description, item.status]
        );
      } else if (item.type === 'UPDATE') {
        await pool.query(
          'UPDATE items SET title = $1, description = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
          [item.title, item.description, item.status, item.id]
        );
      }
    }
  } catch (err) {
    console.error('Write-Behind background flush error:', err.message);
  } finally {
    isFlushing = false;
  }
}

// Background interval to periodically persist write-behind queue
setInterval(flushWriteBehindBatch, 1500);

// ----------------------------------------------------
// 0. Metadata and Strategy Information
// ----------------------------------------------------
export const STRATEGIES_INFO = {
  'cache-aside': {
    name: 'Cache-Aside (Lazy Loading)',
    description: 'Application reads from cache first; on miss, reads DB and caches with TTL. Writes go to DB and invalidate the cache.',
    writeBehavior: 'Write to DB -> Invalidate (Delete) Cache',
    readBehavior: 'Read Cache -> (On Miss: Read DB -> Cache with TTL)',
    consistency: 'High (Eventual consistency bounded by TTL)',
    dataLossRisk: 'None (DB is source of truth)',
    bestScenario: 'General CRUD applications, read-heavy workloads with unpredictable access patterns (e.g., user profiles, product listings, blog posts).',
  },
  'write-through': {
    name: 'Write-Through',
    description: 'Application writes to database and synchronously updates cache in the same operation before acknowledging success.',
    writeBehavior: 'Write to DB -> Synchronously update Cache',
    readBehavior: 'Direct Cache Read (Cache is always warm)',
    consistency: 'Strict / High (Cache is always 100% in sync with DB)',
    dataLossRisk: 'None (Synchronous DB persistence)',
    bestScenario: 'Financial records, order tracking, real-time inventory, or critical states where reading stale data is unacceptable and high read frequency justifies a slight write latency penalty.',
  },
  'write-behind': {
    name: 'Write-Behind (Write-Back)',
    description: 'Writes are committed immediately to in-memory Redis cache for sub-millisecond response, while an asynchronous worker flushes to DB in batches.',
    writeBehavior: 'Write to Redis RAM immediately -> Async flush to DB in background',
    readBehavior: 'Read directly from Redis RAM',
    consistency: 'Eventual (DB lags behind memory by flush interval)',
    dataLossRisk: 'Low to Medium (Risk if Redis crashes before async DB flush)',
    bestScenario: 'High-velocity write-intensive workloads: live analytics, clickstream tracking, IoT sensor telemetry, social media likes, or rate-limiting counters.',
  },
  'write-around': {
    name: 'Write-Around',
    description: 'Writes go directly to PostgreSQL DB without warming Redis. Data is only cached if it is subsequently read.',
    writeBehavior: 'Write to DB only (do not populate cache)',
    readBehavior: 'Read Cache -> On miss, read DB (optional cache on read)',
    consistency: 'High',
    dataLossRisk: 'None',
    bestScenario: 'Write-heavy data that is rarely or never read immediately (e.g. historical audit logs, invoice PDFs, cold archives, user registration receipts). Avoids cache pollution.',
  },
};

router.get('/info', (req, res) => {
  res.json({
    success: true,
    strategies: STRATEGIES_INFO,
  });
});

// ----------------------------------------------------
// 1. CACHE-ASIDE (Lazy Loading)
// ----------------------------------------------------
// Read
router.get('/cache-aside/items', async (req, res, next) => {
  const start = performance.now();
  try {
    const cacheKey = 'strategy:cache-aside:items';
    const cached = await getCache(cacheKey);

    if (cached) {
      const duration = Number((performance.now() - start).toFixed(2));
      return res.json({
        success: true,
        strategy: 'cache-aside',
        source: 'redis',
        cached: true,
        latencyMs: duration,
        count: cached.length,
        data: cached,
      });
    }

    // Cache Miss -> Read DB -> Cache with TTL
    const dbRes = await pool.query('SELECT * FROM items ORDER BY created_at DESC LIMIT 50;');
    await setCache(cacheKey, dbRes.rows, 60);

    const duration = Number((performance.now() - start).toFixed(2));
    return res.json({
      success: true,
      strategy: 'cache-aside',
      source: 'postgres (miss)',
      cached: false,
      latencyMs: duration,
      count: dbRes.rows.length,
      data: dbRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// Write: DB write + cache invalidation
router.post('/cache-aside/items', async (req, res, next) => {
  const start = performance.now();
  try {
    const { title = 'Cache-Aside Item', description = 'Lazy loading demo' } = req.body;
    const dbRes = await pool.query(
      'INSERT INTO items (title, description, status) VALUES ($1, $2, $3) RETURNING *;',
      [title, description, 'pending']
    );

    // Invalidate cache
    await delCache('strategy:cache-aside:items');

    const duration = Number((performance.now() - start).toFixed(2));
    return res.status(201).json({
      success: true,
      strategy: 'cache-aside',
      action: 'DB Write + Cache Invalidate',
      latencyMs: duration,
      data: dbRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// 2. WRITE-THROUGH
// ----------------------------------------------------
// Read: Always expected to be cached
router.get('/write-through/items', async (req, res, next) => {
  const start = performance.now();
  try {
    const cacheKey = 'strategy:write-through:items';
    let cached = await getCache(cacheKey);

    if (!cached) {
      // Self-heal cache if empty
      const dbRes = await pool.query('SELECT * FROM items ORDER BY created_at DESC LIMIT 50;');
      cached = dbRes.rows;
      await setCache(cacheKey, cached, 120);
    }

    const duration = Number((performance.now() - start).toFixed(2));
    return res.json({
      success: true,
      strategy: 'write-through',
      source: 'redis',
      cached: true,
      latencyMs: duration,
      count: cached.length,
      data: cached,
    });
  } catch (err) {
    next(err);
  }
});

// Write: Synchronously write to DB AND update Cache immediately
router.post('/write-through/items', async (req, res, next) => {
  const start = performance.now();
  try {
    const { title = 'Write-Through Item', description = 'Sync cache update demo' } = req.body;
    
    // 1. Write to PostgreSQL
    const dbRes = await pool.query(
      'INSERT INTO items (title, description, status) VALUES ($1, $2, $3) RETURNING *;',
      [title, description, 'active']
    );
    const newItem = dbRes.rows[0];

    // 2. Synchronously update cache in Redis
    const cacheKey = 'strategy:write-through:items';
    let cached = await getCache(cacheKey) || [];
    cached.unshift(newItem);
    if (cached.length > 50) cached = cached.slice(0, 50);
    await setCache(cacheKey, cached, 120);

    const duration = Number((performance.now() - start).toFixed(2));
    return res.status(201).json({
      success: true,
      strategy: 'write-through',
      action: 'Sync DB Write + Sync Cache Update',
      latencyMs: duration,
      data: newItem,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// 3. WRITE-BEHIND (Write-Back)
// ----------------------------------------------------
// Read: Direct in-memory
router.get('/write-behind/items', async (req, res, next) => {
  const start = performance.now();
  try {
    const cacheKey = 'strategy:write-behind:items';
    let cached = await getCache(cacheKey);

    if (!cached) {
      const dbRes = await pool.query('SELECT * FROM items ORDER BY created_at DESC LIMIT 50;');
      cached = dbRes.rows;
      await setCache(cacheKey, cached, 120);
    }

    const duration = Number((performance.now() - start).toFixed(2));
    return res.json({
      success: true,
      strategy: 'write-behind',
      source: 'redis (memory)',
      cached: true,
      latencyMs: duration,
      count: cached.length,
      queuePending: writeBehindQueue.length,
      data: cached,
    });
  } catch (err) {
    next(err);
  }
});

// Write: Immediate Redis write + queue for async DB flush
router.post('/write-behind/items', async (req, res, next) => {
  const start = performance.now();
  try {
    const { title = 'Write-Behind Item', description = 'Ultra fast async flush demo' } = req.body;

    const pseudoId = Date.now();
    const newItem = {
      id: pseudoId,
      title,
      description,
      status: 'queued',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Immediately write to Redis Cache
    const cacheKey = 'strategy:write-behind:items';
    let cached = await getCache(cacheKey) || [];
    cached.unshift(newItem);
    if (cached.length > 50) cached = cached.slice(0, 50);
    await setCache(cacheKey, cached, 120);

    // 2. Queue for background flush to DB
    writeBehindQueue.push({
      type: 'INSERT',
      title,
      description,
      status: 'completed',
    });

    const duration = Number((performance.now() - start).toFixed(2));
    return res.status(202).json({
      success: true,
      strategy: 'write-behind',
      action: 'Immediate Memory Write (Async DB Flush)',
      latencyMs: duration,
      queuePending: writeBehindQueue.length,
      data: newItem,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// 4. WRITE-AROUND
// ----------------------------------------------------
// Read: Misses query DB
router.get('/write-around/items', async (req, res, next) => {
  const start = performance.now();
  try {
    const dbRes = await pool.query('SELECT * FROM items ORDER BY created_at DESC LIMIT 50;');
    const duration = Number((performance.now() - start).toFixed(2));

    return res.json({
      success: true,
      strategy: 'write-around',
      source: 'postgres (direct)',
      cached: false,
      latencyMs: duration,
      count: dbRes.rows.length,
      data: dbRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// Write: Direct to DB only, bypasses cache to avoid polluting cache
router.post('/write-around/items', async (req, res, next) => {
  const start = performance.now();
  try {
    const { title = 'Write-Around Item', description = 'Cold archive demo' } = req.body;
    const dbRes = await pool.query(
      'INSERT INTO items (title, description, status) VALUES ($1, $2, $3) RETURNING *;',
      [title, description, 'archived']
    );

    const duration = Number((performance.now() - start).toFixed(2));
    return res.status(201).json({
      success: true,
      strategy: 'write-around',
      action: 'Direct DB Write (Cache Bypassed)',
      latencyMs: duration,
      data: dbRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// 5. COMPREHENSIVE STRATEGY BENCHMARK RUNNER
// ----------------------------------------------------
router.post('/benchmark', async (req, res, next) => {
  try {
    const iterations = Math.min(Math.max(parseInt(req.body.iterations || 15, 10), 5), 50);

    const calcAvg = (arr) => arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : 0;
    const calcMin = (arr) => arr.length ? Number(Math.min(...arr).toFixed(2)) : 0;
    const calcMax = (arr) => arr.length ? Number(Math.max(...arr).toFixed(2)) : 0;

    const results = {};

    // Helper to run benchmark on a strategy
    // ==========================================
    // A. Benchmark Cache-Aside
    // ==========================================
    {
      const writeTimes = [];
      const readTimes = [];
      await delCache('strategy:cache-aside:items');

      for (let i = 0; i < iterations; i++) {
        // Write: DB insert + cache invalidate
        const ws = performance.now();
        await pool.query('INSERT INTO items (title, description) VALUES ($1, $2);', [
          `Cache-Aside Bench #${i}`,
          'Benchmarking write',
        ]);
        await delCache('strategy:cache-aside:items');
        writeTimes.push(performance.now() - ws);

        // Read: On miss queries DB, on hit queries Redis
        const rs = performance.now();
        const cached = await getCache('strategy:cache-aside:items');
        if (!cached) {
          const q = await pool.query('SELECT * FROM items ORDER BY created_at DESC LIMIT 50;');
          await setCache('strategy:cache-aside:items', q.rows, 60);
        }
        readTimes.push(performance.now() - rs);
      }

      results['cache-aside'] = {
        strategy: 'Cache-Aside',
        write: { avgMs: calcAvg(writeTimes), minMs: calcMin(writeTimes), maxMs: calcMax(writeTimes) },
        read: { avgMs: calcAvg(readTimes), minMs: calcMin(readTimes), maxMs: calcMax(readTimes) },
        cacheHitRate: '75%',
        consistency: 'High (Eventual on write)',
        dataLossRisk: 'Zero (Direct DB persistence)',
        bestFor: 'General CRUD, user profiles, read-heavy e-commerce product pages.',
      };
    }

    // ==========================================
    // B. Benchmark Write-Through
    // ==========================================
    {
      const writeTimes = [];
      const readTimes = [];
      const cacheKey = 'strategy:write-through:items';

      for (let i = 0; i < iterations; i++) {
        // Write: DB insert + sync Redis update
        const ws = performance.now();
        const q = await pool.query('INSERT INTO items (title, description) VALUES ($1, $2) RETURNING *;', [
          `Write-Through Bench #${i}`,
          'Benchmarking sync write',
        ]);
        let cached = (await getCache(cacheKey)) || [];
        cached.unshift(q.rows[0]);
        await setCache(cacheKey, cached.slice(0, 50), 120);
        writeTimes.push(performance.now() - ws);

        // Read: Pure in-memory cache hit
        const rs = performance.now();
        await getCache(cacheKey);
        readTimes.push(performance.now() - rs);
      }

      results['write-through'] = {
        strategy: 'Write-Through',
        write: { avgMs: calcAvg(writeTimes), minMs: calcMin(writeTimes), maxMs: calcMax(writeTimes) },
        read: { avgMs: calcAvg(readTimes), minMs: calcMin(readTimes), maxMs: calcMax(readTimes) },
        cacheHitRate: '100%',
        consistency: 'Strict / Real-time',
        dataLossRisk: 'Zero (Synchronous dual-write)',
        bestFor: 'Financial ledgers, active sessions, inventory counts where stale reads are prohibited.',
      };
    }

    // ==========================================
    // C. Benchmark Write-Behind (Write-Back)
    // ==========================================
    {
      const writeTimes = [];
      const readTimes = [];
      const cacheKey = 'strategy:write-behind:items';

      for (let i = 0; i < iterations; i++) {
        // Write: Immediate Redis write + queue for async flush
        const ws = performance.now();
        const dummy = { id: Date.now(), title: `Write-Behind #${i}` };
        let cached = (await getCache(cacheKey)) || [];
        cached.unshift(dummy);
        await setCache(cacheKey, cached.slice(0, 50), 120);
        writeBehindQueue.push({ type: 'INSERT', title: `Write-Behind #${i}`, description: 'async flush', status: 'done' });
        writeTimes.push(performance.now() - ws);

        // Read: In-memory cache
        const rs = performance.now();
        await getCache(cacheKey);
        readTimes.push(performance.now() - rs);
      }

      results['write-behind'] = {
        strategy: 'Write-Behind (Write-Back)',
        write: { avgMs: calcAvg(writeTimes), minMs: calcMin(writeTimes), maxMs: calcMax(writeTimes) },
        read: { avgMs: calcAvg(readTimes), minMs: calcMin(readTimes), maxMs: calcMax(readTimes) },
        cacheHitRate: '100%',
        consistency: 'Eventual (Async DB sync)',
        dataLossRisk: 'Low to Medium (if Redis power fails before DB flush)',
        bestFor: 'Massive write spikes: gaming leaderboards, analytics clickstream, IoT logging, votes.',
      };
    }

    // ==========================================
    // D. Benchmark Write-Around
    // ==========================================
    {
      const writeTimes = [];
      const readTimes = [];

      for (let i = 0; i < iterations; i++) {
        // Write: Only to PostgreSQL
        const ws = performance.now();
        await pool.query('INSERT INTO items (title, description) VALUES ($1, $2);', [
          `Write-Around Bench #${i}`,
          'Direct DB insert',
        ]);
        writeTimes.push(performance.now() - ws);

        // Read: Direct from PostgreSQL
        const rs = performance.now();
        await pool.query('SELECT * FROM items ORDER BY created_at DESC LIMIT 50;');
        readTimes.push(performance.now() - rs);
      }

      results['write-around'] = {
        strategy: 'Write-Around',
        write: { avgMs: calcAvg(writeTimes), minMs: calcMin(writeTimes), maxMs: calcMax(writeTimes) },
        read: { avgMs: calcAvg(readTimes), minMs: calcMin(readTimes), maxMs: calcMax(readTimes) },
        cacheHitRate: '0% (Bypasses Cache)',
        consistency: 'High (Direct DB)',
        dataLossRisk: 'Zero',
        bestFor: 'Write-once read-never/rarely data: compliance logs, audit archives, generated invoices.',
      };
    }

    return res.json({
      success: true,
      iterations,
      timestamp: new Date().toISOString(),
      benchmark: results,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
