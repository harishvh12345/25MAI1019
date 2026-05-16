# Campus Notification Platform — System Design

---

## Stage 1

### Core Actions Supported by the Notification Platform

1. **Fetch all notifications** for a student (paginated)
2. **Fetch a single notification** by ID
3. **Mark a notification as read**
4. **Mark all notifications as read**
5. **Delete a notification**
6. **Get unread notification count**
7. **Filter notifications by type** (Placement, Event, Result)

---

### REST API Endpoints

#### 1. GET /api/v1/notifications

Fetch paginated notifications for the authenticated student.

**Headers:**
```
Content-Type: application/json
X-Student-ID: <student_id>
X-Request-ID: <uuid>
```

**Query Parameters:**
```
page           integer   Page number (default: 1)
limit          integer   Items per page (default: 20, max: 100)
notification_type  string    Filter: "Placement" | "Event" | "Result"
is_read        boolean   Filter by read status
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
        "student_id": "stu_1042",
        "type": "Placement",
        "message": "CSX Corporation hiring — Apply by May 10",
        "is_read": false,
        "created_at": "2026-04-22T17:51:30Z",
        "updated_at": "2026-04-22T17:51:30Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

---

#### 2. GET /api/v1/notifications/:id

Fetch a single notification by ID.

**Headers:**
```
Content-Type: application/json
X-Student-ID: <student_id>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "student_id": "stu_1042",
    "type": "Placement",
    "message": "CSX Corporation hiring — Apply by May 10",
    "is_read": true,
    "created_at": "2026-04-22T17:51:30Z",
    "updated_at": "2026-04-22T18:00:00Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "NOTIFICATION_NOT_FOUND",
    "message": "No notification found with the given ID."
  }
}
```

---

#### 3. PATCH /api/v1/notifications/:id/read

Mark a single notification as read.

**Headers:**
```
Content-Type: application/json
X-Student-ID: <student_id>
```

**Request Body:** *(none required)*

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "is_read": true,
    "updated_at": "2026-04-22T18:05:00Z"
  }
}
```

---

#### 4. PATCH /api/v1/notifications/read-all

Mark all notifications for the student as read.

**Headers:**
```
Content-Type: application/json
X-Student-ID: <student_id>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "updated_count": 47
  }
}
```

---

#### 5. DELETE /api/v1/notifications/:id

Delete (soft-delete) a notification.

**Headers:**
```
Content-Type: application/json
X-Student-ID: <student_id>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "deleted": true
  }
}
```

---

#### 6. GET /api/v1/notifications/unread-count

Get count of unread notifications for the student.

**Headers:**
```
Content-Type: application/json
X-Student-ID: <student_id>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "unread_count": 12
  }
}
```

---

### Real-Time Notification Mechanism: WebSocket

**Chosen approach: WebSocket (via Socket.IO or raw WS)**

When a new notification is broadcast by the server (e.g., HR clicks "Notify All"), students with an active browser session receive the notification in real-time without polling.

**WebSocket Handshake:**
```
ws://campus.example.com/ws/notifications?student_id=stu_1042
```

**Server → Client Event (new notification arrives):**
```json
{
  "event": "NEW_NOTIFICATION",
  "payload": {
    "id": "abc123",
    "type": "Placement",
    "message": "Google hiring — Apply by May 15",
    "created_at": "2026-04-22T18:10:00Z"
  }
}
```

**Client → Server Event (acknowledge read):**
```json
{
  "event": "MARK_READ",
  "payload": {
    "notification_id": "abc123"
  }
}
```

**Why WebSocket over SSE or Polling:**
- Bi-directional: client can send read-receipts in real-time
- Lower overhead than repeated HTTP polling at scale
- SSE is unidirectional and less suitable for read-acknowledgement flows
- Works well with Socket.IO rooms — each student is in their own room, enabling targeted pushes

---

## Stage 2

### Recommended Database: PostgreSQL

**Why PostgreSQL:**
- Strong ACID guarantees — critical for notification delivery correctness
- Native support for ENUM types, UUID, JSONB for extensible metadata
- Excellent indexing support (B-tree, GIN, partial indexes) essential for our query patterns
- Row-level security (RLS) can enforce per-student data isolation
- Scales well with read replicas and partitioning for high-volume workloads
- Wide industry adoption with mature tooling (pgAdmin, pg_dump, logical replication)

---

### Database Schema

```sql
-- Enum for notification types
CREATE TYPE notification_type AS ENUM ('Placement', 'Event', 'Result');

-- Students table (reference; assumed managed elsewhere)
CREATE TABLE students (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    roll_number   VARCHAR(50) UNIQUE NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core notifications table
CREATE TABLE notifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    type              notification_type NOT NULL,
    message           TEXT NOT NULL,
    is_read           BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
    metadata          JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for core query: unread notifications per student ordered by time
CREATE INDEX idx_notifications_student_unread
    ON notifications (student_id, is_read, created_at DESC)
    WHERE is_deleted = FALSE;

-- Index for type-based filtering
CREATE INDEX idx_notifications_type
    ON notifications (type, created_at DESC)
    WHERE is_deleted = FALSE;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### Problems as Data Volume Increases

| Problem | Root Cause | Solution |
|---|---|---|
| Slow reads | Full table scans on 5M+ rows | Composite indexes, partial indexes on `is_deleted = FALSE` |
| Index bloat | Too many indexes updated on every write | Use selective, partial indexes only |
| Single-node bottleneck | All reads/writes on one server | Read replicas for GET endpoints |
| Large rows per student | Students accumulate thousands of notifications | Partition by `created_at` (range partitioning) |
| Archival costs | Old notifications bloat active table | Move old rows to `notifications_archive` table |
| Write amplification at scale | Bulk inserts for 50K students block reads | Use `COPY` for bulk inserts, batch with queuing |

**Partitioning Strategy:**
```sql
-- Partition notifications by created_at month
CREATE TABLE notifications (
    id UUID,
    student_id UUID NOT NULL,
    type notification_type NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE notifications_2026_04
    PARTITION OF notifications
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE notifications_2026_05
    PARTITION OF notifications
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
-- Older partitions can be detached and archived
```

---

### SQL Queries

**Q1: Fetch paginated notifications for a student:**
```sql
SELECT id, type, message, is_read, created_at
FROM notifications
WHERE student_id = $1
  AND is_deleted = FALSE
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

**Q2: Fetch single notification:**
```sql
SELECT id, student_id, type, message, is_read, created_at, updated_at
FROM notifications
WHERE id = $1
  AND student_id = $2
  AND is_deleted = FALSE;
```

**Q3: Mark notification as read:**
```sql
UPDATE notifications
SET is_read = TRUE, updated_at = NOW()
WHERE id = $1 AND student_id = $2 AND is_deleted = FALSE;
```

**Q4: Mark all notifications as read:**
```sql
UPDATE notifications
SET is_read = TRUE, updated_at = NOW()
WHERE student_id = $1 AND is_read = FALSE AND is_deleted = FALSE;
```

**Q5: Get unread count:**
```sql
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE student_id = $1 AND is_read = FALSE AND is_deleted = FALSE;
```

**Q6: Soft delete notification:**
```sql
UPDATE notifications
SET is_deleted = TRUE, updated_at = NOW()
WHERE id = $1 AND student_id = $2;
```

---

## Stage 3

### Analysis of the Slow Query

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isread = false
ORDER BY createdAt ASC;
```

**Is the query accurate?**

Not fully. Issues:

1. **`SELECT *`** — fetches every column including potentially large `metadata` (JSONB). Should select only required fields.
2. **`ORDER BY createdAt ASC`** — for a notification inbox, most recent notifications should come first (`DESC`). Ascending order means oldest unread notifications appear first, which is poor UX.
3. **No `LIMIT`** — with 5,000,000 rows across 50,000 students, a student could have hundreds of unread notifications. Without pagination, all rows are returned in a single query, overwhelming both DB and client.
4. **`isread`** vs **`is_read`** — naming convention inconsistency with schema (minor but reflects real-world issues).

---

**Why is it slow?**

With 5,000,000 notifications across 50,000 students, an average student has ~100 notifications, but power users or notification-heavy periods could have thousands. Without an index:

- PostgreSQL performs a **sequential scan** (Seq Scan) on the entire `notifications` table
- All 5,000,000 rows are scanned, filtered, then sorted
- `ORDER BY` triggers an additional **filesort** if result doesn't fit in memory
- **Estimated cost:** O(N) scan → O(K log K) sort where N = 5M, K = result set size. Practically: 1–5 seconds per query under load.

---

**What to change:**

```sql
-- Corrected, optimized query
SELECT id, type, message, is_read, created_at
FROM notifications
WHERE student_id = $1        -- parameterized, matches indexed column name
  AND is_read = FALSE
  AND is_deleted = FALSE
ORDER BY created_at DESC     -- DESC for most-recent-first UX
LIMIT 20 OFFSET 0;           -- paginate; never return unbounded results
```

**Index to create:**
```sql
CREATE INDEX idx_notifications_student_unread
    ON notifications (student_id, is_read, created_at DESC)
    WHERE is_deleted = FALSE;
```

With this partial composite index:
- `student_id = $1` → B-tree lookup: O(log N)
- `is_read = FALSE` → filters within student's index sub-tree
- `created_at DESC` → index already sorted; no filesort needed
- `WHERE is_deleted = FALSE` → partial index excludes deleted rows, keeping index lean
- **Estimated cost after:** O(log N + K) where K = rows returned (typically 20). Sub-millisecond for paginated fetches.

---

**Is indexing every column safe/effective?**

**No.** This advice is harmful at scale. Reasons:

| Problem | Explanation |
|---|---|
| Write amplification | Every `INSERT` / `UPDATE` must update all indexes simultaneously. With 50K student bulk inserts, this becomes catastrophic. |
| Index bloat | Indexes consume significant disk space. A `message TEXT` index alone on 5M rows would be gigabytes of wasted storage. |
| Planner confusion | PostgreSQL's query planner evaluates all available indexes. Too many indexes increases planning time and can lead to suboptimal plan selection. |
| Low-cardinality waste | Indexing `is_deleted` alone (boolean, 2 values) is almost always useless — the planner prefers a seq scan when selectivity is low. |

**Best practice:** Index only columns used in `WHERE`, `JOIN ON`, or `ORDER BY` clauses in hot queries. Prefer composite partial indexes over single-column ones.

---

**Query: All students with a Placement notification in the last 7 days:**

```sql
SELECT DISTINCT s.id, s.name, s.email, s.roll_number
FROM notifications n
JOIN students s ON s.id = n.student_id
WHERE n.type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days'
  AND n.is_deleted = FALSE
ORDER BY s.name ASC;
```

Supporting index:
```sql
CREATE INDEX idx_notifications_type_created
    ON notifications (type, created_at DESC)
    WHERE is_deleted = FALSE;
```

---

## Stage 4

### Problem: DB Overwhelmed by Per-Page-Load Fetches

At 50,000 students, if each page load triggers a DB query, and students average 10 page loads/day, that's **500,000 DB reads/day** — before accounting for burst traffic during placement season.

---

### Strategies

#### Strategy 1: Server-Side Caching with Redis

**Approach:** Cache per-student notification results in Redis with a TTL of 30–60 seconds.

```
Key: notifications:{student_id}:page:{page}:limit:{limit}
TTL: 60 seconds
```

On write (new notification / mark-read), invalidate the relevant cache keys.

**Tradeoffs:**
| Pros | Cons |
|---|---|
| Dramatic reduction in DB reads (cache hit ratio ~90%+) | Stale data window (up to 60s) — acceptable for notifications |
| Sub-millisecond response from Redis | Cache invalidation complexity — must invalidate on every write |
| Horizontally scalable (Redis Cluster) | Additional infra cost and operational overhead |
| Works seamlessly with existing REST API | Cold cache on server restart requires DB fallback |

---

#### Strategy 2: Client-Side Caching with Cache-Control Headers

**Approach:** Set HTTP cache headers on GET responses.

```
Cache-Control: private, max-age=30
ETag: "abc123hash"
```

Browser caches the response. On re-request, client sends `If-None-Match` header; server returns `304 Not Modified` if unchanged — **zero DB hit**.

**Tradeoffs:**
| Pros | Cons |
|---|---|
| Zero server load for cached responses | Only works for GET requests; client must respect headers |
| Native browser support, no infra needed | Difficult to invalidate proactively (push new notification while page is cached) |
| Complements Redis caching | Different browsers handle `private` cache differently |

---

#### Strategy 3: Unread Count Caching + Lazy Full Fetch

**Approach:** Cache only the `unread_count` (a single integer per student) in Redis. Show the count in the nav bar. Fetch full notifications only when the student opens the inbox.

This reduces DB queries from every page load → only when student explicitly views notifications.

**Tradeoffs:**
| Pros | Cons |
|---|---|
| Massive reduction in full-list queries | Count can go stale if cache isn't invalidated on new notification |
| Count is trivially small to cache | Still requires a full DB fetch when inbox is opened |
| Pairs well with WebSocket (push count updates live) | Slightly more complex frontend logic |

---

#### Strategy 4: Database Read Replicas

**Approach:** Route all read (GET) queries to PostgreSQL read replicas. Writes (mark-read, delete) go to primary.

**Tradeoffs:**
| Pros | Cons |
|---|---|
| Scales read throughput horizontally | Replication lag (typically <100ms) means brief inconsistency |
| No application logic change needed (connection pool routing) | Infra cost — maintaining replicas |
| Doesn't require a caching layer | Doesn't eliminate the per-page-load query problem on its own |

---

#### Recommended Combination

1. **Redis cache** for notification lists (TTL: 30s), invalidated on writes
2. **WebSocket** to push real-time updates, avoiding polling entirely
3. **Unread count in Redis** updated atomically on new notification
4. **Read replica** for DB-level query distribution

This combination reduces DB read pressure by ~95% while keeping the UX snappy and near-real-time.

---

## Stage 5

### Shortcomings of the Proposed Implementation

```python
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)   # calls Email API
        save_to_db(student_id, message)   # DB insert
        push_to_app(student_id, message)  # WebSocket push
```

**Problems identified:**

1. **Synchronous sequential loop:** Sending 50,000 emails one-by-one is catastrophically slow. If each `send_email` takes 200ms, total time = 50,000 × 200ms = **~2.8 hours**.
2. **No atomicity or error handling:** If `send_email` fails for student 200, the loop halts (or silently skips). No retry, no dead-letter queue.
3. **All three operations are coupled:** If `save_to_db` fails after `send_email` succeeds, the student receives an email but has no in-app notification — data inconsistency.
4. **No partial failure recovery:** If the process crashes at student 25,000, there's no way to resume from where it left off. Restarting re-sends emails to the first 25,000.
5. **Email API rate limits:** External email providers (SendGrid, SES) have rate limits. Hammering them with 50K sequential calls will trigger throttling or bans.
6. **DB write amplification:** 50,000 individual `INSERT` statements instead of a bulk insert — extremely inefficient.
7. **`push_to_app` during loop:** WebSocket pushes during the loop can create thundering herd — 50K connections receive pushes at different times with unpredictable ordering.

---

**Logs indicate `send_email` failed for 200 students midway — what now?**

Without a retry mechanism, those 200 students are silently skipped. With the current design, the only recovery is to manually identify failed IDs and rerun — fragile and error-prone.

---

**Should DB save and email send happen together (atomically)?**

**No — they should NOT be tightly coupled in a single transaction.** Reasons:

- Email is an **external side effect** — it cannot be rolled back. If a DB transaction rolls back after email is sent, the email has already been delivered.
- DB writes are fast and reliable; email sends are slow and failure-prone (network, rate limits, provider outages).
- Coupling them means a DB failure blocks email and vice versa — reducing resilience of both.

**Correct approach:** Save to DB first (fast, reliable, idempotent). Then enqueue email delivery asynchronously. DB is the source of truth; email is a best-effort side effect.

---

### Redesigned Architecture

**Components:**
- **Message Queue** (e.g., RabbitMQ / Redis Streams / AWS SQS)
- **Worker Pool** (N parallel workers consuming from queue)
- **Idempotency key** per (student_id, notification_id) pair
- **Dead Letter Queue (DLQ)** for failed deliveries after max retries
- **Bulk DB insert** before enqueuing

---

**Revised Pseudocode:**

```python
function notify_all(student_ids: array, message: string):
    # Step 1: Bulk insert all notifications into DB atomically
    notification_records = []
    for student_id in student_ids:
        notification_records.append({
            id: generate_uuid(),
            student_id: student_id,
            type: "Placement",
            message: message,
            is_read: false,
            created_at: now()
        })

    bulk_insert_db(notification_records)
    # DB is now the source of truth — all 50K records exist
    log.info(f"Bulk inserted {len(notification_records)} notifications")

    # Step 2: Enqueue delivery jobs (email + push) for async processing
    for record in notification_records:
        job = {
            idempotency_key: f"{record.student_id}:{record.id}",
            student_id: record.student_id,
            notification_id: record.id,
            message: record.message,
            tasks: ["send_email", "push_to_app"]
        }
        enqueue(queue="notification_delivery", payload=job)

    log.info("All delivery jobs enqueued")


# Worker (runs in parallel across N processes/threads)
function delivery_worker():
    while True:
        job = dequeue(queue="notification_delivery")

        if already_processed(job.idempotency_key):
            log.info(f"Duplicate job skipped: {job.idempotency_key}")
            continue

        success = true

        # Email delivery with retry
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                send_email(job.student_id, job.message)
                log.info(f"Email sent: student={job.student_id} attempt={attempt}")
                break
            except RateLimitError:
                log.warn(f"Rate limited, backing off: attempt={attempt}")
                sleep(exponential_backoff(attempt))
            except Exception as e:
                log.error(f"Email failed: {e}, attempt={attempt}")
                if attempt == MAX_RETRIES:
                    send_to_dlq(job, reason=str(e))
                    success = false

        # WebSocket push (best-effort, no retry needed — client reconnects)
        try:
            push_to_app(job.student_id, job.notification_id)
        except Exception as e:
            log.warn(f"Push failed for {job.student_id}: {e}")
            # Non-critical: student will see notification on next page load from DB

        if success:
            mark_processed(job.idempotency_key)


# DLQ processor (runs periodically, e.g., every 15 minutes)
function dlq_processor():
    failed_jobs = fetch_dlq_jobs()
    log.info(f"Retrying {len(failed_jobs)} failed email deliveries")
    for job in failed_jobs:
        try:
            send_email(job.student_id, job.message)
            remove_from_dlq(job)
            log.info(f"DLQ retry success: {job.student_id}")
        except Exception as e:
            log.error(f"DLQ retry failed: {job.student_id} — {e}")
            # Alert on-call if DLQ grows beyond threshold
```

**Key improvements:**
- DB insert is bulk and atomic — completes in milliseconds
- Email + push are decoupled, async, and independently retried
- Idempotency keys prevent duplicate emails on worker restarts
- DLQ captures permanently-failing deliveries for manual review
- Workers scale horizontally — 50K emails distributed across N workers

---

## Stage 6

### Priority Inbox Approach

**Priority Score Formula:**

```
priority_score = (type_weight × W_type) + (recency_score × W_recency)
```

Where:
- `type_weight`: Placement = 3, Result = 2, Event = 1
- `recency_score`: `1 / (1 + hours_since_notification)` — decays as notification ages
- `W_type = 0.6`, `W_recency = 0.4` (configurable weights)

This ensures a recent Placement always outranks an old Result, but a very recent Event can compete with an old Result.

**Maintaining Top-N Efficiently as New Notifications Arrive:**

Use a **min-heap of size N**. As each new notification is processed:
1. Compute its priority score
2. If heap has fewer than N items → push it
3. If its score > heap minimum → pop minimum, push new notification
4. Otherwise → discard

This gives O(log N) per insertion — optimal for streaming notifications.

See `priority_inbox.py` for the full implementation.
