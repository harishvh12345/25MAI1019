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
python priority_inbox.py        
python priority_inbox.py 15     


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


