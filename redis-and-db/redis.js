import Redis from 'ioredis';
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';

dotenv.config();

let isConnected = false;

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  maxRetriesPerRequest: 2,
});

redis.on('connect', () => {
  isConnected = true;
  console.log('✅ Connected to Redis cache');
});

redis.on('error', (err) => {
  isConnected = false;
  console.warn('⚠️  Redis cache notice:', err.message);
});

export const connectRedis = async () => {
  try {
    await redis.connect();
    isConnected = true;
    return true;
  } catch (err) {
    isConnected = false;
    console.warn('⚠️  Redis connection initial attempt failed (will retry):', err.message);
    return false;
  }
};

export const isRedisReady = () => isConnected;

export const getCache = async (key) => {
  if (!isConnected) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Redis get error:', err.message);
    return null;
  }
};

export const setCache = async (key, value, ttlSeconds = parseInt(process.env.CACHE_TTL || '60', 10)) => {
  if (!isConnected) return false;
  try {
    const str = JSON.stringify(value);
    await redis.set(key, str, 'EX', ttlSeconds);
    return true;
  } catch (err) {
    console.error('Redis set error:', err.message);
    return false;
  }
};

export const delCache = async (key) => {
  if (!isConnected) return false;
  try {
    await redis.del(key);
    return true;
  } catch (err) {
    console.error('Redis del error:', err.message);
    return false;
  }
};

export const invalidateCachePattern = async (pattern = 'items:*') => {
  if (!isConnected) return false;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return true;
  } catch (err) {
    console.error('Redis invalidatePattern error:', err.message);
    return false;
  }
};

export const pingRedis = async () => {
  if (!isConnected) return { connected: false, pingMs: null };
  const start = performance.now();
  try {
    await redis.ping();
    const duration = Number((performance.now() - start).toFixed(2));
    return { connected: true, pingMs: duration };
  } catch (err) {
    return { connected: false, pingMs: null, error: err.message };
  }
};
