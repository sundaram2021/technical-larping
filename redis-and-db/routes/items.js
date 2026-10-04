import { Router } from 'express';
import { pool } from '../db.js';
import { trackedQuery, trackedRedis, metricsTracker } from '../metrics.js';
import { getCache, setCache, invalidateCachePattern } from '../redis.js';

const router = Router();

// Helper to validate numeric ID
const parseId = (idParam) => {
  const id = parseInt(idParam, 10);
  return isNaN(id) ? null : id;
};

// 1. CREATE: POST /api/items
router.post('/', async (req, res, next) => {
  try {
    const { title, description, status } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'The "title" field is required and must be a non-empty string.',
      });
    }

    const query = `
      INSERT INTO items (title, description, status)
      VALUES ($1, $2, COALESCE($3, 'pending'))
      RETURNING *;
    `;
    const values = [title.trim(), description ? description.trim() : null, status ? status.trim() : null];

    const result = await trackedQuery(pool, 'write', 'INSERT', query, values);

    // Invalidate Redis cache on write
    await trackedRedis('write', 'CACHE_DEL', () => invalidateCachePattern('items:*'));

    return res.status(201).json({
      success: true,
      message: 'Item created successfully (cache invalidated)',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// 2. READ ALL: GET /api/items (supports optional ?status= and ?no_cache=true)
router.get('/', async (req, res, next) => {
  try {
    const { status, no_cache } = req.query;
    const cacheKey = `items:list:${status || 'all'}`;

    // If cache not bypassed, check Redis
    if (no_cache !== 'true') {
      const cached = await trackedRedis('read', 'CACHE_HIT', () => getCache(cacheKey));
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Data-Source', 'Redis');
        return res.json({
          success: true,
          source: 'cache (redis)',
          cached: true,
          count: cached.length,
          data: cached,
        });
      }
      metricsTracker.recordCacheMiss();
    }

    // Cache MISS: Query PostgreSQL
    let query = 'SELECT * FROM items';
    const values = [];

    if (status) {
      query += ' WHERE status = $1';
      values.push(status);
    }

    query += ' ORDER BY created_at DESC;';

    const result = await trackedQuery(pool, 'read', 'SELECT', query, values);

    // Populate Redis Cache in background
    if (no_cache !== 'true') {
      await trackedRedis('write', 'CACHE_SET', () => setCache(cacheKey, result.rows, 60));
    }

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Data-Source', 'PostgreSQL');
    return res.json({
      success: true,
      source: 'database (postgresql)',
      cached: false,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

// 3. READ ONE: GET /api/items/:id (supports ?no_cache=true)
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID. Must be an integer.',
      });
    }

    const { no_cache } = req.query;
    const cacheKey = `items:id:${id}`;

    if (no_cache !== 'true') {
      const cached = await trackedRedis('read', 'CACHE_HIT', () => getCache(cacheKey));
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Data-Source', 'Redis');
        return res.json({
          success: true,
          source: 'cache (redis)',
          cached: true,
          data: cached,
        });
      }
      metricsTracker.recordCacheMiss();
    }

    const result = await trackedQuery(pool, 'read', 'SELECT', 'SELECT * FROM items WHERE id = $1;', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Item with ID ${id} not found.`,
      });
    }

    const item = result.rows[0];
    if (no_cache !== 'true') {
      await trackedRedis('write', 'CACHE_SET', () => setCache(cacheKey, item, 60));
    }

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Data-Source', 'PostgreSQL');
    return res.json({
      success: true,
      source: 'database (postgresql)',
      cached: false,
      data: item,
    });
  } catch (error) {
    next(error);
  }
});

// 4. UPDATE: PUT /api/items/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID. Must be an integer.',
      });
    }

    const { title, description, status } = req.body;

    const existing = await trackedQuery(pool, 'read', 'SELECT', 'SELECT * FROM items WHERE id = $1;', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Item with ID ${id} not found.`,
      });
    }

    const currentItem = existing.rows[0];
    const updatedTitle = title !== undefined ? title.trim() : currentItem.title;
    const updatedDescription = description !== undefined ? (description ? description.trim() : null) : currentItem.description;
    const updatedStatus = status !== undefined ? status.trim() : currentItem.status;

    if (!updatedTitle) {
      return res.status(400).json({
        success: false,
        message: 'The "title" cannot be empty.',
      });
    }

    const query = `
      UPDATE items
      SET title = $1, description = $2, status = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;
    const values = [updatedTitle, updatedDescription, updatedStatus, id];

    const result = await trackedQuery(pool, 'write', 'UPDATE', query, values);

    // Invalidate Redis cache on update
    await trackedRedis('write', 'CACHE_DEL', () => invalidateCachePattern('items:*'));

    return res.json({
      success: true,
      message: 'Item updated successfully (cache invalidated)',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// 5. DELETE: DELETE /api/items/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID. Must be an integer.',
      });
    }

    const result = await trackedQuery(pool, 'write', 'DELETE', 'DELETE FROM items WHERE id = $1 RETURNING *;', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Item with ID ${id} not found.`,
      });
    }

    // Invalidate Redis cache on delete
    await trackedRedis('write', 'CACHE_DEL', () => invalidateCachePattern('items:*'));

    return res.json({
      success: true,
      message: 'Item deleted successfully (cache invalidated)',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

export default router;
