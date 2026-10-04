# Kuch-Bhi - Express & PostgreSQL CRUD Application

A production-ready Node.js REST API using Express and PostgreSQL running inside Docker.

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

### 2. Start PostgreSQL with Docker
Start the database container using Docker Compose:

```bash
docker compose up -d
# or via pnpm script:
pnpm docker:up
```

To stop the database container when you're done:
```bash
docker compose down
# or:
pnpm docker:down
```

---

### 3. Start the Node.js Server

Install dependencies (if not already installed):
```bash
pnpm install
```

Start the application:
```bash
# In development mode (auto-reloads on file changes)
pnpm dev

# In production mode
pnpm start
```

The server will initialize the PostgreSQL table `items` automatically on startup and listen on `http://localhost:3000`.

---

## ⚙️ Environment Variables

Configuration is loaded from `.env`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Application HTTP port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | Database username |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_NAME` | `kuchbhi_db` | Database name |

---

## 📡 API Reference & CRUD Endpoints

### Base URL: `http://localhost:3000`

### 1. Health Check
- **`GET /api/health`**
- Returns database connectivity status and current database timestamp.

```bash
curl http://localhost:3000/api/health
```

---

### 2. Create an Item (Create)
- **`POST /api/items`**
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs, and bread",
  "status": "pending"
}
```

**Curl:**
```bash
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"Buy groceries\", \"description\": \"Milk, eggs, and bread\", \"status\": \"pending\"}"
```

---

### 3. List All Items (Read)
- **`GET /api/items`**
- Supports optional status filter: `GET /api/items?status=pending`

**Curl:**
```bash
curl http://localhost:3000/api/items
```

---

### 4. Get a Single Item by ID (Read)
- **`GET /api/items/:id`**

**Curl:**
```bash
curl http://localhost:3000/api/items/1
```

---

### 5. Update an Item (Update)
- **`PUT /api/items/:id`**
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "title": "Buy groceries and snacks",
  "description": "Milk, eggs, bread, and fruits",
  "status": "completed"
}
```

**Curl:**
```bash
curl -X PUT http://localhost:3000/api/items/1 \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"Buy groceries and snacks\", \"status\": \"completed\"}"
```

---

### 6. Delete an Item (Delete)
- **`DELETE /api/items/:id`**

**Curl:**
```bash
curl -X DELETE http://localhost:3000/api/items/1
```

---

## 📊 Live Metrics Calculator & Visual Dashboard

Access the interactive visual dashboard at:
👉 **`http://localhost:3000`** or **`http://localhost:3000/dashboard`**

### Features:
- **Interactive Charts**:
  - Real-time line chart tracking Read vs. Write database latency over time.
  - Operation distribution donut chart (Reads vs. Writes, INSERT/SELECT/UPDATE/DELETE).
- **Latency KPIs**:
  - Average, Maximum, and P95 latency (in milliseconds) for writes and reads.
- **Benchmark & Auto-Populate Tool**:
  - Run automated workloads of 10, 25, 50, or 100 operations to benchmark PostgreSQL read/write performance.
- **Live CRUD & Feed**:
  - Immediate latency log for every incoming query.
  - Interactive table to view, toggle, and delete PostgreSQL rows with immediate chart feedback.

### Metrics API Endpoints:

- **`GET /api/metrics`**: Returns current metrics summary and operation history.
- **`POST /api/metrics/benchmark`**: Generates sample records, executes reads/updates, and returns latency statistics.
- **`POST /api/metrics/reset`**: Resets metrics counters and latency histories.

---

## 🧠 Redis Caching Strategies Lab & Scenario Guide

The application implements and benchmarks the **4 foundational Redis caching patterns**:

| Strategy | How it Works | Avg Write (ms) | Avg Read (ms) | Consistency | Best Scenario / When to Use |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Cache-Aside** *(Lazy Loading)* | Read cache first; on miss, query DB & cache with TTL. Writes go to DB and invalidate cache. | **~8 – 12 ms** | **~2 – 7 ms** *(miss: ~15ms, hit: ~1ms)* | Eventual | **Standard CRUD & Read-heavy apps**: user profiles, e-commerce catalog, blog posts. Highly resilient to cache crashes. |
| **2. Write-Through** | Writes to DB and synchronously updates Redis cache before responding. Reads are always in-memory hits. | **~7 – 10 ms** | **~1.1 – 1.4 ms** | Strict (Zero stale data) | **Critical consistency**: financial balances, order checkout state, active user sessions, inventory reserves. |
| **3. Write-Behind** *(Write-Back)* | Writes commit to Redis RAM immediately (< 2ms); background async worker flushes to DB in batches. | **~1.8 – 2.5 ms** | **~0.9 – 1.2 ms** | Eventual | **Massive write throughput**: gaming leaderboards, analytics clickstream, telemetry, vote counting, IoT data feeds. |
| **4. Write-Around** | Writes go directly to PostgreSQL DB without touching Redis. Data is only cached if subsequently requested. | **~5 – 7 ms** | **~2.5 – 5 ms** | High | **Write-once, read-rarely data**: generated invoices, PDF receipts, compliance archives, audit logs. Prevents cache churn. |

### Caching Strategy API Endpoints:

- **Run Multi-Strategy Comparative Benchmark**:
  ```bash
  curl -X POST http://localhost:3000/api/strategies/benchmark \
    -H "Content-Type: application/json" \
    -d "{\"iterations\": 15}"
  ```
- **Test Individual Strategies**:
  - `GET /api/strategies/cache-aside/items` & `POST /api/strategies/cache-aside/items`
  - `GET /api/strategies/write-through/items` & `POST /api/strategies/write-through/items`
  - `GET /api/strategies/write-behind/items` & `POST /api/strategies/write-behind/items`
  - `GET /api/strategies/write-around/items` & `POST /api/strategies/write-around/items`

