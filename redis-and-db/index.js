import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, initDB } from './db.js';
import { connectRedis, isRedisReady, pingRedis } from './redis.js';
import itemsRouter from './routes/items.js';
import metricsRouter from './routes/metrics.js';
import strategiesRouter from './routes/strategies.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Root route: Serve HTML dashboard, or API JSON if Accept is application/json
app.get('/api', (req, res) => {
  res.json({
    name: 'Kuch-Bhi Express & PostgreSQL & Redis CRUD & Metrics API',
    status: 'running',
    cache: {
      enabled: isRedisReady(),
      engine: 'Redis 7 Alpine',
    },
    endpoints: {
      dashboard: 'GET / or GET /dashboard',
      health: 'GET /api/health',
      metrics: {
        summary: 'GET /api/metrics',
        benchmark: 'POST /api/metrics/benchmark',
        compareCache: 'POST /api/metrics/benchmark-cache',
        reset: 'POST /api/metrics/reset',
      },
      items: {
        create: 'POST /api/items',
        readAll: 'GET /api/items (optional ?no_cache=true)',
        readOne: 'GET /api/items/:id (optional ?no_cache=true)',
        update: 'PUT /api/items/:id',
        delete: 'DELETE /api/items/:id',
      },
    },
  });
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint (checks PostgreSQL & Redis connection)
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbTime = null;
  let redisPing = await pingRedis();

  try {
    const result = await pool.query('SELECT NOW() as current_time;');
    dbStatus = 'connected';
    dbTime = result.rows[0].current_time;
  } catch (error) {
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    database: {
      status: dbStatus,
      time: dbTime,
    },
    redis: {
      status: redisPing.connected ? 'connected' : 'disconnected',
      pingMs: redisPing.pingMs,
    },
  });
});

// Mount Routers
app.use('/api/items', itemsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/strategies', strategiesRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
  });
});

// Start server and initialize database & Redis
async function startServer() {
  try {
    await initDB();
    await connectRedis();

    app.listen(PORT, () => {
      console.log(`🚀 Server listening at http://localhost:${PORT}`);
      console.log(`📊 Metrics Dashboard available at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed during server startup:');
    console.error(error.message);

    app.listen(PORT, () => {
      console.log(`⚠️  Server started in degraded mode at http://localhost:${PORT}`);
    });
  }
}

startServer();
