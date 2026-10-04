import { performance } from 'perf_hooks';

class MetricCalculator {
  constructor() {
    this.history = [];
    this.maxHistory = 100;
    this.stats = {
      writes: { count: 0, totalMs: 0, minMs: null, maxMs: 0, durations: [] },
      reads: { count: 0, totalMs: 0, minMs: null, maxMs: 0, durations: [] },
      redisReads: { count: 0, totalMs: 0, minMs: null, maxMs: 0, durations: [] },
      redisWrites: { count: 0, totalMs: 0, minMs: null, maxMs: 0, durations: [] },
      cache: {
        hits: 0,
        misses: 0,
      },
      actions: {
        INSERT: 0,
        SELECT: 0,
        UPDATE: 0,
        DELETE: 0,
        CACHE_HIT: 0,
        CACHE_SET: 0,
        CACHE_DEL: 0,
      },
    };
  }

  record({ type, action, durationMs, rowCount = 0, source = 'postgres', error = false }) {
    const validDuration = Number(durationMs.toFixed(2));
    
    if (source === 'redis') {
      if (type === 'read') {
        this.stats.redisReads.count += 1;
        this.stats.redisReads.totalMs += validDuration;
        this.stats.redisReads.minMs = this.stats.redisReads.minMs === null ? validDuration : Math.min(this.stats.redisReads.minMs, validDuration);
        this.stats.redisReads.maxMs = Math.max(this.stats.redisReads.maxMs, validDuration);
        this.stats.redisReads.durations.push(validDuration);
        this.stats.cache.hits += 1;
        this.stats.actions.CACHE_HIT += 1;
      } else {
        this.stats.redisWrites.count += 1;
        this.stats.redisWrites.totalMs += validDuration;
        this.stats.redisWrites.minMs = this.stats.redisWrites.minMs === null ? validDuration : Math.min(this.stats.redisWrites.minMs, validDuration);
        this.stats.redisWrites.maxMs = Math.max(this.stats.redisWrites.maxMs, validDuration);
        this.stats.redisWrites.durations.push(validDuration);
        if (action === 'CACHE_SET') this.stats.actions.CACHE_SET += 1;
        if (action === 'CACHE_DEL') this.stats.actions.CACHE_DEL += 1;
      }
    } else {
      // Postgres metrics
      const target = type === 'write' ? this.stats.writes : this.stats.reads;
      target.count += 1;
      target.totalMs += validDuration;
      target.minMs = target.minMs === null ? validDuration : Math.min(target.minMs, validDuration);
      target.maxMs = Math.max(target.maxMs, validDuration);
      target.durations.push(validDuration);

      if (this.stats.actions[action] !== undefined) {
        this.stats.actions[action] += 1;
      }
    }

    const entry = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      type,
      action,
      source,
      durationMs: validDuration,
      rowCount,
      error,
    };

    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return entry;
  }

  recordCacheMiss() {
    this.stats.cache.misses += 1;
  }

  calculatePercentile(sortedArr, p) {
    if (sortedArr.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, index)] || 0;
  }

  getSummary() {
    const writeDurations = [...this.stats.writes.durations].sort((a, b) => a - b);
    const readDurations = [...this.stats.reads.durations].sort((a, b) => a - b);
    const redisReadDurations = [...this.stats.redisReads.durations].sort((a, b) => a - b);

    const avgWrite = this.stats.writes.count > 0 ? Number((this.stats.writes.totalMs / this.stats.writes.count).toFixed(2)) : 0;
    const avgRead = this.stats.reads.count > 0 ? Number((this.stats.reads.totalMs / this.stats.reads.count).toFixed(2)) : 0;
    const avgRedisRead = this.stats.redisReads.count > 0 ? Number((this.stats.redisReads.totalMs / this.stats.redisReads.count).toFixed(2)) : 0;

    const totalCacheLookups = this.stats.cache.hits + this.stats.cache.misses;
    const hitRate = totalCacheLookups > 0 ? Number(((this.stats.cache.hits / totalCacheLookups) * 100).toFixed(1)) : 0;

    // Speedup factor calculation: PostgreSQL avg read vs Redis avg read
    let speedup = 1.0;
    if (avgRead > 0 && avgRedisRead > 0) {
      speedup = Number((avgRead / avgRedisRead).toFixed(1));
    }

    return {
      summary: {
        totalOperations: this.stats.writes.count + this.stats.reads.count + this.stats.redisReads.count,
        postgres: {
          writes: {
            count: this.stats.writes.count,
            avgMs: avgWrite,
            minMs: this.stats.writes.minMs ?? 0,
            maxMs: this.stats.writes.maxMs,
            p95Ms: this.calculatePercentile(writeDurations, 95),
          },
          reads: {
            count: this.stats.reads.count,
            avgMs: avgRead,
            minMs: this.stats.reads.minMs ?? 0,
            maxMs: this.stats.reads.maxMs,
            p95Ms: this.calculatePercentile(readDurations, 95),
          },
        },
        redis: {
          reads: {
            count: this.stats.redisReads.count,
            avgMs: avgRedisRead,
            minMs: this.stats.redisReads.minMs ?? 0,
            maxMs: this.stats.redisReads.maxMs,
            p95Ms: this.calculatePercentile(redisReadDurations, 95),
          },
          cacheStats: {
            hits: this.stats.cache.hits,
            misses: this.stats.cache.misses,
            hitRatePercent: hitRate,
          },
          speedupMultiplier: speedup,
        },
        actions: this.stats.actions,
      },
      recentHistory: this.history.slice(-50),
    };
  }

  reset() {
    this.history = [];
    this.stats = {
      writes: { count: 0, totalMs: 0, minMs: null, maxMs: 0, durations: [] },
      reads: { count: 0, totalMs: 0, minMs: null, maxMs: 0, durations: [] },
      redisReads: { count: 0, totalMs: 0, minMs: null, maxMs: 0, durations: [] },
      redisWrites: { count: 0, totalMs: 0, minMs: null, maxMs: 0, durations: [] },
      cache: {
        hits: 0,
        misses: 0,
      },
      actions: {
        INSERT: 0,
        SELECT: 0,
        UPDATE: 0,
        DELETE: 0,
        CACHE_HIT: 0,
        CACHE_SET: 0,
        CACHE_DEL: 0,
      },
    };
  }
}

export const metricsTracker = new MetricCalculator();

/**
 * Execute a query with automatic latency measurement and metric tracking.
 */
export async function trackedQuery(pool, type, action, text, params = []) {
  const start = performance.now();
  let rowCount = 0;
  let error = false;

  try {
    const result = await pool.query(text, params);
    rowCount = result.rowCount || (result.rows ? result.rows.length : 0);
    return result;
  } catch (err) {
    error = true;
    throw err;
  } finally {
    const durationMs = performance.now() - start;
    metricsTracker.record({
      type,
      action,
      durationMs,
      rowCount,
      source: 'postgres',
      error,
    });
  }
}

/**
 * Track a Redis operation latency.
 */
export async function trackedRedis(type, action, fn) {
  const start = performance.now();
  let error = false;
  let result = null;
  try {
    result = await fn();
    return result;
  } catch (err) {
    error = true;
    throw err;
  } finally {
    const durationMs = performance.now() - start;
    metricsTracker.record({
      type,
      action,
      durationMs,
      rowCount: result ? (Array.isArray(result) ? result.length : 1) : 0,
      source: 'redis',
      error,
    });
  }
}
