# 💾 Caching in Computing Systems — Complete Guide

> **Series:** System Design Fundamentals  
> **Source:** [ByteByteGo — YouTube](https://youtu.be/ouipSd_5ivQ)  
> **Topic:** Caching Across All Layers — Hardware, OS, Application, Database, and Distributed Systems

---

## Table of Contents

1. [What is Caching?](#1-what-is-caching)
2. [The Cache Hierarchy](#2-the-cache-hierarchy)
3. [Hardware Caches — L1, L2, L3 & TLB](#3-hardware-caches--l1-l2-l3--tlb)
4. [Operating System Level Caches](#4-operating-system-level-caches)
5. [Application Layer Caching](#5-application-layer-caching)
   - 5.1 [Browser HTTP Cache](#51-browser-http-cache)
   - 5.2 [CDN Edge Caching](#52-cdn-edge-caching)
   - 5.3 [Load Balancer Caching](#53-load-balancer-caching)
6. [Distributed Caching](#6-distributed-caching)
   - 6.1 [In-Memory Caches (Redis, Memcached)](#61-in-memory-caches-redis-memcached)
   - 6.2 [Message Brokers with Persistent Caching (Kafka)](#62-message-brokers-with-persistent-caching-kafka)
7. [Full-Text Search Indexing](#7-full-text-search-indexing)
8. [Database Caching Mechanisms](#8-database-caching-mechanisms)
   - 8.1 [Buffer Pool](#81-buffer-pool)
   - 8.2 [Materialized Views](#82-materialized-views)
   - 8.3 [Write-Ahead Log (WAL)](#83-write-ahead-log-wal)
   - 8.4 [Transaction & Replication Logs](#84-transaction--replication-logs)
9. [Cache Eviction Policies](#9-cache-eviction-policies)
10. [Cache Consistency & Invalidation](#10-cache-consistency--invalidation)
11. [Cache Patterns in System Design](#11-cache-patterns-in-system-design)
12. [When NOT to Cache](#12-when-not-to-cache)
13. [Quick Reference — Cache Types & Characteristics](#13-quick-reference--cache-types--characteristics)
14. [Glossary](#14-glossary)
15. [Key Takeaways](#15-key-takeaways)

---

## 1. What is Caching?

**Caching** is a technique to store frequently accessed data in faster-access locations, reducing latency and improving throughput.

The fundamental principle:
```
Slow, Large Storage  ←→  Fast, Small Cache  ←→  CPU / User
(Disk / Main Memory)        (CPU Cache / RAM)    (Request)

Every access first checks the cache.
If "cache hit" → return data immediately
If "cache miss" → fetch from slow storage, return, and cache for next time
```

### Why Caching Works

1. **Temporal Locality** — data accessed recently is likely accessed again soon
2. **Spatial Locality** — nearby data is likely accessed together
3. **Pareto Principle** — 80% of accesses target 20% of data

Caching exploits these patterns to dramatically improve performance.

### The Cost of Not Caching

```
Example: Find a user by ID in a database of 10 million users

Without cache:
  Every request → 10-100ms disk I/O (SSD)
  1,000 req/sec → 10-100 seconds of I/O time per second
  Impossible to scale with more users

With cache (Redis):
  Cache hit → 1ms in-memory lookup
  Cache miss → 50ms disk I/O + cache for future
  Assuming 90% hit rate → avg 1ms × 0.9 + 50ms × 0.1 = 5.9ms per request
  1,000 req/sec → easily achieved
```

---

## 2. The Cache Hierarchy

Modern computing systems employ **multiple caching layers**, each trading off speed vs. capacity:

```
                    SPEED ↑          CAPACITY ↑
                      |                  |
CPU Registers:    < 1 ns      ← smallest, fastest
L1 Cache:         ~1-2 ns              ↓
L2 Cache:         ~4-10 ns             |
L3 Cache:         ~20-40 ns            |
Main RAM:         ~100 ns              |
Page Cache (OS):  ~1 μs                |
SSD:              ~100 μs              |
HDD:              ~5 ms                |
Network (LAN):    ~100 μs              |
CDN Edge Cache:   ~10-100 ms (geographically distributed)
Origin Server:    ~100-500 ms → largest, slowest
```

Each layer:
- Serves the layer above it
- Is much faster than the layer below
- Holds a subset of data from the layer below
- Uses **eviction policies** (LRU, LFU, etc.) to manage space

---

## 3. Hardware Caches — L1, L2, L3 & TLB

### L1 Cache (Level 1)

| Property | Details |
|---|---|
| **Location** | Integrated into CPU core |
| **Size** | 32–64 KB per core |
| **Speed** | ~1–2 nanoseconds |
| **Contents** | Most frequently accessed instructions and data |
| **Per-core?** | Yes — each core has its own L1 |

When the CPU executes an instruction:
1. Check L1 cache
2. If hit → use data immediately (1-2 ns)
3. If miss → request from L2

### L2 Cache (Level 2)

| Property | Details |
|---|---|
| **Location** | On CPU die, or separate chip |
| **Size** | 256 KB – 1 MB per core |
| **Speed** | ~4–10 nanoseconds |
| **Contents** | Cache of cache — data from L3 or RAM |
| **Scope** | Usually per-core (though shared variants exist) |

### L3 Cache (Level 3)

| Property | Details |
|---|---|
| **Location** | On CPU package, shared across cores |
| **Size** | 8–32 MB shared |
| **Speed** | ~20–40 nanoseconds |
| **Purpose** | Shared buffer between all cores |
| **Scope** | **Shared** across all cores on a CPU |

L3 cache helps **cache coherence** — when one core modifies data, it updates L3, and other cores see the change through L3.

### Translation Lookaside Buffer (TLB)

Modern CPUs use **virtual memory** — every memory access goes through a virtual-to-physical address translation. This translation is expensive, so CPUs cache recent translations:

| Property | Details |
|---|---|
| **Purpose** | Cache virtual → physical address mappings |
| **Speed** | Very fast (~1-5 cycles) vs. full page table walk (~100+ cycles) |
| **Size** | 64–1024 entries depending on CPU |
| **Impact** | TLB misses cause ~10-100x slowdown on memory access |

> **Practical implication:** Large programs with poor memory locality (jumping across huge address spaces) suffer TLB misses. Keeping working set small (locality of reference) reduces misses.

---

## 4. Operating System Level Caches

The OS manages memory between RAM and slow disk storage.

### Page Cache

```
Application
    ↓
  Request disk block (e.g., /var/log/app.log bytes 1000-2000)
    ↓
  [OS Page Cache] ← is it here?
    ├─ YES → return from memory (fast, ~1 μs)
    └─ NO  → read from disk (slow, ~100 μs) → store in page cache → return
```

**Characteristics:**
- Transparent to applications — no code changes needed
- Automatically managed — OS evicts old pages as needed
- Uses **LRU (Least Recently Used)** eviction
- Can consume unused RAM to improve performance

### Inode Cache

File system metadata (permissions, timestamps, hard link count) is cached:

```
Application: open("/home/alice/documents/report.pdf")
  ↓
[Inode Cache] — already have inode for this file?
  ├─ YES → skip disk lookup, fast
  └─ NO  → read inode from disk, cache it
```

### Page Cache + Inode Cache in Action

```
First file read (cold cache):
  Application → OS → Page Cache MISS → Disk read (100 μs) → store in cache → return

Second file read (warm cache):
  Application → OS → Page Cache HIT → RAM access (1 μs) → return
  Speedup: 100x

Accessing another file's metadata:
  Application → OS → Inode Cache HIT → return immediately
  Without cache would require another disk seek (~5 ms)
```

---

## 5. Application Layer Caching

### 5.1 Browser HTTP Cache

Web browsers cache HTTP responses based on **HTTP headers**:

```
Server sends:
  HTTP/1.1 200 OK
  Cache-Control: max-age=3600
  ETag: "abc123"
  Last-Modified: Wed, 15 Jan 2025 10:00:00 GMT

Browser behavior:
  1. Store response in local cache
  2. For next 3600 seconds, serve from cache (no network request)
  3. After expiry, ask server: "Has this changed?" (conditional request)
     Server may respond 304 Not Modified (use cache) or 200 (new content)
```

**Benefits:**
- Reduces bandwidth usage
- Dramatically faster page loads
- Works offline (for cached content)

**Challenge:** Cache invalidation is hard
- Set too long → stale content
- Set too short → repeated network requests

### 5.2 CDN Edge Caching

**CDN (Content Delivery Network)** = globally distributed servers that cache content near users.

```
User in Tokyo          User in New York         User in London
  ↓                          ↓                        ↓
[CDN Edge              [CDN Edge                 [CDN Edge
 in Tokyo]             in New York]              in London]
  └─ cache static          cache static            cache static
    content               content                 content
     ↓                      ↓                        ↓
     └──────────→ Origin Server (only on cache miss)
```

**How it works:**
1. User requests `image.jpg`
2. CDN checks edge cache in nearest location
3. If cache hit → serve immediately (~50 ms globally)
4. If cache miss → fetch from origin (~100-500 ms) → cache for next user

**What gets cached:**
- Images, videos (large files)
- CSS, JavaScript (static assets)
- HTML (sometimes, if properly versioned)

**Real-world impact:**
- Netflix uses CDNs to cache video chunks near users (1ms latency)
- Amazon CloudFront serves static assets (99.9% cache hit ratio possible)

### 5.3 Load Balancer Caching

Some load balancers (reverse proxies like Nginx) can cache backend responses:

```
User request → Nginx reverse proxy
  ↓
[Nginx response cache] — have we served this before?
  ├─ HIT → serve from cache (avoid backend)
  └─ MISS → forward to backend → cache response → serve

Benefits:
  - Reduces load on backend servers
  - Faster response (cache hit latency < backend latency)
  - Helps handle traffic spikes
```

---

## 6. Distributed Caching

### 6.1 In-Memory Caches (Redis, Memcached)

**Redis** and **Memcached** are fast, distributed in-memory key-value stores.

```
Application                    Redis Cache
     |                              |
     |── GET user:123 ─────────────→|
     |                              |
     |← {name: "Alice", ...} ←──────|  (O(1) in ~1 ms)
     |
     | (cache miss?)
     |
     |── Query DB (slow) ───────────→ PostgreSQL
     |                                    |
     |← query result ←───────────────────|  (10-100 ms)
     |
     |── SET user:123 {cached} ────→ Redis  (update cache)
     |
     |
     | (next request, cache hit)
     |── GET user:123 ─────────────→ Redis (fast!)
```

**Characteristics:**

| Feature | Detail |
|---|---|
| **Speed** | ~1 ms per operation vs 10-100 ms for database |
| **Throughput** | 100k-1M ops/sec depending on deployment |
| **Persistence** | Optional (RDB snapshots or AOF logs) |
| **Distribution** | Can scale horizontally via sharding |
| **Eviction** | LRU/LFU when memory full |

**Real use cases:**
- Session storage — user login sessions cached across servers
- Leaderboards — sorted sets (Redis native data structure)
- Rate limiting — atomic counters and sliding windows
- Pub/Sub messaging — real-time notifications
- Real-time analytics — fast aggregations

### 6.2 Message Brokers with Persistent Caching (Kafka)

Unlike Redis (volatile in-memory), **Kafka** persists messages to disk:

```
Producer                 Kafka Cluster                    Consumer 1
  |                            |                               |
  |── send(message) ──────────→| (persisted to disk)           |
  |                            |← read messages ──────────────→|
  |                            |
  |                            | Consumer 2 (catches up later)
  |                            |
  |                            |← read same messages ─────────→|
  |                            |   (asynchronous read)

Benefits:
  - Messages aren't lost if a consumer crashes
  - Multiple consumers can read the same messages
  - Can replay messages from any point in time (with retention policy)
  - Decouples producer and consumer timing
```

**Retention policy:** Keep messages for N days or until N GB accumulated, then delete.

---

## 7. Full-Text Search Indexing

Search engines like **Elasticsearch**, **Solr**, and **Apache Lucene** index documents for fast searching:

```
Raw data (logs, documents):
  [log line 1: "User alice logged in at 2025-01-15 10:30"]
  [log line 2: "User bob transferred $100 to alice"]
  [log line 3: "User carol logged out at 10:35"]
  ...millions of lines

Build inverted index:
  "alice" → [line 1, line 2, ...]
  "logged" → [line 1, line 3, ...]
  "bob" → [line 2, ...]
  "transfer" → [line 2, ...]

Query: "alice logged"
  → Find docs containing "alice" AND "logged"
  → Result: [line 1, ...]  (instant, O(1) or O(log n) lookup)

Without index:
  → Scan all millions of lines (O(n)) — too slow
```

**Real-world usage:**
- Log aggregation (ELK stack: Elasticsearch, Logstash, Kibana)
- Google search (index every page on the web)
- GitHub code search (index every repository)

---

## 8. Database Caching Mechanisms

Databases use multiple caching layers internally:

### 8.1 Buffer Pool

Every database has a **buffer pool** — a chunk of RAM used to cache disk pages:

```
Query: SELECT * FROM users WHERE id = 42

Database engine:
  1. Check buffer pool — is page containing user 42 in RAM?
     ├─ HIT → return immediately
     └─ MISS → read from disk, store in buffer pool, return

Buffer pool management:
  - When full, evict LRU (least recently used) page
  - Dirty pages (modified) written back to disk asynchronously
  - Size typically 25–50% of available system memory
```

**Why it matters:**
- A query hitting buffer pool: <1 ms
- A query missing buffer pool: 50-100 ms (SSD) or 5-10 ms (HDD)
- **10-100x difference**

### 8.2 Materialized Views

Pre-computed query results stored in the database:

```
Complex query (without materialized view):
  SELECT user_id, COUNT(*) as order_count, SUM(total) as revenue
  FROM orders
  GROUP BY user_id
  HAVING COUNT(*) > 10
  ORDER BY revenue DESC

  Execution time: 5-30 seconds (joins, aggregations, sorting)

Materialized view:
  CREATE MATERIALIZED VIEW top_customers AS
    SELECT user_id, COUNT(*) as order_count, SUM(total) as revenue
    FROM orders
    GROUP BY user_id
    HAVING COUNT(*) > 10
    ORDER BY revenue DESC

  Query: SELECT * FROM top_customers
  Execution time: <1 second (pre-computed)

Trade-off:
  + Query is fast
  - View must be refreshed when underlying data changes
  - Uses extra storage (duplication)
```

### 8.3 Write-Ahead Log (WAL)

To ensure durability, databases write changes to a **log** before indexing:

```
User: UPDATE users SET status='active' WHERE id=42

Database:
  1. Write to WAL (persistent log): "UPDATE users id=42 to active"
  2. Once written to disk, confirm to user ("committed")
  3. Asynchronously update in-memory pages and indexes
  4. Write modified pages back to disk (checkpoint)

Why:
  - If crash happens after step 1, can replay from WAL
  - If crash in steps 3-4, WAL tells us what to recover
  - User never loses committed data
```

### 8.4 Transaction & Replication Logs

| Log Type | Purpose |
|---|---|
| **Transaction Log** | Records all operations for ACID compliance and crash recovery |
| **Replication Log** | In distributed databases, tracks changes for replication to other nodes |
| **Redo Log** | Records changes to redo them during crash recovery |
| **Undo Log** | Stores original values to rollback transactions |

---

## 9. Cache Eviction Policies

When a cache is full, what gets removed? Different strategies:

### LRU (Least Recently Used)

```
Cache size: 3 items
Timeline:
  1. Add A
  2. Add B
  3. Add C (cache full)
  4. Access A (move A to end)
  5. Add D → evict B (least recently used)

Cache: [A, C, D]
```

**Pros:** Simple, works well for most workloads  
**Cons:** Doesn't distinguish between frequently and rarely accessed items

**Implementation:** HashMap + Doubly Linked List (O(1) operations)

### LFU (Least Frequently Used)

```
Cache size: 3 items
Item frequencies:
  A: accessed 10 times (frequent)
  B: accessed 1 time (infrequent)
  C: accessed 5 times
  D: new item to add

Evict B (least frequently used)
```

**Pros:** Better for long-term patterns (hot items stay longer)  
**Cons:** More complex; frequency counts must be maintained

### FIFO (First In, First Out)

Remove oldest item regardless of access pattern.

**Use case:** When data has natural age-based value (logs, timestamps)

### Random Eviction

Remove a random item. Simple but unpredictable.

### TTL (Time-To-Live)

Items automatically expire after a set duration:

```
Cache set with TTL:
  SET user:123 {data} WITH TTL 300 seconds

After 300 seconds:
  GET user:123 → (cache expired)
  → fetch fresh data from source
```

**Use case:** Session caches, rate limiting windows

---

## 10. Cache Consistency & Invalidation

The hardest problem in caching: **keeping cached data fresh**.

### Cache-Aside (Lazy Loading)

```
Read:
  1. Check cache
  2. If miss → fetch from source
  3. Update cache

Problem:
  Source data changes → cache still has stale data until evicted
  User sees outdated information
```

### Write-Through

```
Write:
  1. Update source data
  2. Update cache (synchronously)
  3. Return to user

Ensures cache is always fresh
Cost: Every write goes to both cache + source (slower)
```

### Write-Behind (Write-Back)

```
Write:
  1. Update cache immediately (return quickly)
  2. Asynchronously update source

Fast writes, but risk losing data if cache crashes before flush
(used in CDNs, databases for performance)
```

### Explicit Invalidation

```
Source data changes:
  → Delete cache entry
  → Next read will miss, fetch fresh data

Used in APIs, web applications
Requires application to know what to invalidate
```

### Event-Based Invalidation

```
Database change → emit event (webhook, message queue)
→ Cache service listens → invalidates relevant entries
(used in microservices, event-driven systems)
```

---

## 11. Cache Patterns in System Design

### Pattern 1: Cache-Aside (Most Common)

```
Application:
  result = cache.get(key)
  if (!result) {
    result = db.query(key)
    cache.set(key, result)
  }
  return result
```

**Pros:** Simple, works with existing code  
**Cons:** Cache miss → slow (db.query blocks)

### Pattern 2: Read-Through Cache

```
Application:
  result = cache.get(key)
  // Cache itself fetches from DB if miss
  return result
```

Cache is responsible for loading data. Application doesn't know about DB.

**Pros:** Separation of concerns  
**Cons:** Requires cache library that knows how to fetch data

### Pattern 3: Write-Through Cache

```
Application:
  cache.set(key, value)
  db.set(key, value)
  return
```

All writes go through cache first.

### Pattern 4: Write-Behind Cache

```
Application:
  cache.set(key, value)  // instant, async
  // cache later flushes to db
  return
```

Fast writes at cost of durability risk.

---

## 12. When NOT to Cache

Caching isn't always beneficial:

| Scenario | Why Don't Cache |
|---|---|
| **Always-changing data** | Cache invalidation becomes expensive; miss rate high |
| **Large data with low locality** | Cache hit rate too low to justify overhead |
| **Sensitive real-time data** | Medical records, financial transactions — must read fresh |
| **Small/fast lookups** | Cache overhead > benefit (e.g., hash table O(1) vs cache O(10 ns)) |
| **Write-heavy workloads** | Cache invalidation overhead exceeds cache hit benefit |
| **Insufficient memory** | Cache too small to hold working set; high miss rate |

---

## 13. Quick Reference — Cache Types & Characteristics

| Cache Type | Location | Speed | Size | Primary Purpose | Eviction | Auto-Managed |
|---|---|---|---|---|---|---|
| **L1** | CPU core | ~1-2 ns | 32-64 KB | CPU data/instructions | (hardware) | ✅ |
| **L2** | CPU die | ~4-10 ns | 256 KB-1 MB | Secondary buffer | (hardware) | ✅ |
| **L3** | CPU package | ~20-40 ns | 8-32 MB | Multi-core shared | (hardware) | ✅ |
| **TLB** | CPU | ~1-5 cycles | 64-1K entries | Virtual→physical address | (hardware) | ✅ |
| **Page Cache** | RAM (OS) | ~1 μs | 10s-100s MB | Disk blocks | LRU | ✅ |
| **Inode Cache** | RAM (OS) | ~1 μs | 100s KB | File metadata | LRU | ✅ |
| **Browser HTTP** | Client disk/RAM | ~10 ms | 100s MB | HTTP responses | Expiry | ✅ |
| **CDN** | Distributed servers | ~50 ms global | TB distributed | Static web content | TTL/LRU | ✅ |
| **Load Balancer** | Balancer RAM | ~1 ms | 100s MB | HTTP responses | LRU | ✅ |
| **Redis** | RAM (distributed) | ~1 ms | GB distributed | Key-value data | LRU/LFU/TTL | ❌ |
| **Memcached** | RAM | ~1 ms | GB distributed | Key-value data | LRU | ❌ |
| **Kafka** | Disk | ~10 ms | TB | Messages (persistent) | Time/Size | ✅ |
| **DB Buffer Pool** | RAM (server) | ~1 μs | 25-50% RAM | Query result pages | LRU | ✅ |
| **Materialized View** | Disk/RAM | ~1 ms | GB | Pre-computed results | Manual refresh | ❌ |
| **Search Index** | Disk + RAM | ~10 ms | 10-100% original | Indexed documents | N/A | ✅ |

---

## 14. Glossary

| Term | Definition |
|---|---|
| **Cache Hit** | Requested data found in cache; returned without fetching from slower source |
| **Cache Miss** | Requested data not in cache; must fetch from source (slower) |
| **Hit Ratio** | Percentage of requests that hit cache (0–100%) |
| **Eviction** | Removal of cache entry to make room for new entries |
| **Warm Cache** | Cache populated with frequently accessed data; high hit rate |
| **Cold Cache** | Empty cache or recently flushed; low hit rate initially |
| **Locality of Reference** | Tendency to reuse same data; exploited by caching |
| **TTL (Time-To-Live)** | Duration after which cached entry automatically expires |
| **WAL** | Write-Ahead Log; entries written to log before memory structures |
| **Buffer Pool** | In-memory cache of disk pages managed by database |
| **Materialized View** | Pre-computed query result stored in database |
| **Inverted Index** | Data structure mapping terms to documents (used in search) |
| **LRU** | Least Recently Used; eviction policy removing least-accessed item |
| **LFU** | Least Frequently Used; eviction policy based on access frequency |
| **Cache Coherence** | Mechanism ensuring different caches see consistent data |
| **Cache Invalidation** | Process of marking cached data as stale/expired |

---

## 15. Key Takeaways

1. **Caching is the foundation of performance.** Every layer of computing systems — CPU, OS, application, network, database — uses caching to avoid re-computation and slow storage access.

2. **The cache hierarchy is exponential.** Each level is 10–100x slower than the previous, but vastly larger. Missing one level is a huge performance hit.

3. **Hardware caches are automatic.** L1, L2, L3, TLB are managed by the CPU — your code can only influence them via cache-friendly algorithms (avoiding pointer chasing, improving temporal locality).

4. **OS caches are automatic.** Page cache and inode cache are transparently managed — they make disk access way faster without code changes.

5. **Application caching is manual.** Browser cache, CDN cache, Redis — these require explicit configuration and invalidation strategies. This is where most system design work happens.

6. **Cache invalidation is the hardest problem.** Phil Karlton: "There are only two hard things in computing: cache invalidation and naming things." Choose your invalidation strategy carefully (TTL, event-based, write-through).

7. **Cache hit ratio is the metric.** A 90% cache hit rate means 10% of requests go to slow storage. Every 1% improvement = significant latency reduction.

8. **Different caches for different purposes.** Redis for session/hot data, CDN for static assets, DB buffer pool for working set, Kafka for durable messaging. No one-size-fits-all.

9. **Size matters.** A cache too small has high miss rate (defeating the purpose); too large wastes memory. The working set of your application should fit in available cache.

10. **Monitor cache behavior.** In production, track hit ratio, eviction rate, and tail latencies. A degrading hit ratio indicates misaligned cache vs. actual access patterns.

---

> 📂 **See also:** The `implementations/` folder contains working JavaScript examples of LRU cache, LFU cache, TTL cache, and multi-layer caching simulations.

---

> 📚 **Continue Learning:**
> - [Designing Data-Intensive Applications](https://dataintensive.net/) — Martin Kleppmann (cache chapters)
> - [Redis Documentation](https://redis.io/documentation)
> - [How Browsers Work](https://www.html5rocks.com/en/tutorials/internals/howbrowserswork/) — cache section
> - [Database Internals](https://www.oreilly.com/library/view/database-internals/9781491932812/) — cache chapters

---

*Guide based on ByteByteGo's "Caching in Computing Systems" and extended with implementation depth.*
