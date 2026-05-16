# Affordmed Campus Notification Platform — Assessment Submission

## Repository Structure

```
affordmed-submission/
├── notification_system_design.md   # Stages 1–6 design document
├── priority_inbox.py               # Stage 6 Python implementation
├── priority_inbox.log              # Generated on run
└── campus-notify-frontend/         # Stage 7 Next.js application
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx                    → redirects to /notifications
    │   │   ├── api/notifications/route.ts  → API proxy (avoids CORS)
    │   │   ├── notifications/page.tsx      → All Notifications page
    │   │   └── priority/page.tsx           → Priority Inbox page
    │   ├── components/
    │   │   ├── Navbar.tsx
    │   │   └── NotificationCard.tsx
    │   ├── hooks/
    │   │   └── useViewedNotifications.ts
    │   └── lib/
    │       ├── types.ts
    │       ├── api.ts
    │       └── theme.ts
    ├── package.json
    ├── next.config.js
    └── tsconfig.json
```

---

## Stage 6 — Priority Inbox (Python)

**Run:**
```bash
python priority_inbox.py        # Top 10 (default)
python priority_inbox.py 15     # Top 15
```

**Algorithm:** Min-heap of size N. O(log N) per new notification.

**Priority formula:**
```
score = (type_weight_normalized × 0.6) + (recency_score × 0.4)
type weights: Placement=3, Result=2, Event=1
recency_score = 1 / (1 + hours_elapsed)
```

---

## Stage 7 — Next.js Frontend


```bash
cd campus-notify-frontend
npm install
npm run dev
```
App runs at **http://localhost:3000**

**Pages:**
- `/notifications` — All notifications with type filters, pagination, read/unread state
- `/priority` — Priority inbox with adjustable top-N slider (5–20) and type filter

**Key features:**
- Material UI throughout
- Unread/viewed tracking via localStorage (survives page refresh)
- API proxy at `/api/notifications` handles CORS with upstream
- Responsive (mobile + desktop)
- Loading skeletons, error states with retry
- Notification type color-coding (Placement=blue, Result=purple, Event=orange)
- Priority scores displayed in priority view

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI Library | Material UI v5 |
| State | React useState/useEffect + localStorage |
| API Proxy | Next.js Route Handler |
| DB (design) | PostgreSQL with partitioning |
| Cache (design) | Redis + read replicas |
| Queue (design) | RabbitMQ / Redis Streams |
| Real-time (design) | WebSocket (Socket.IO) |
