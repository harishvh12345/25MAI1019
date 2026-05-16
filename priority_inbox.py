"""
Stage 6 — Priority Inbox Implementation
Campus Notification Platform — Affordmed Assessment

Priority Score:
    score = (type_weight * 0.6) + (recency_score * 0.4)

    type_weight:   Placement=3, Result=2, Event=1
    recency_score: 1 / (1 + hours_elapsed)

Uses a min-heap of size N to efficiently maintain Top-N as new
notifications stream in. Time complexity: O(log N) per insertion.
"""

import heapq
import logging
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
import urllib.request
import json

# ── Logging Middleware ────────────────────────────────────────────────────────

LOG_FORMAT = "[%(asctime)s] [%(levelname)-8s] [%(name)s] %(message)s"
logging.basicConfig(
    level=logging.DEBUG,
    format=LOG_FORMAT,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("priority_inbox.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("priority_inbox")

# ── Constants ─────────────────────────────────────────────────────────────────

API_URL = "http://4.224.186.213/evaluation-service/notifications"
API_HEADERS = {
    "Content-Type": "application/json",
}

TYPE_WEIGHTS: dict[str, int] = {
    "Placement": 3,
    "Result":    2,
    "Event":     1,
}

W_TYPE    = 0.6
W_RECENCY = 0.4

# ── Data Model ────────────────────────────────────────────────────────────────

@dataclass
class Notification:
    id:         str
    type:       str
    message:    str
    timestamp:  datetime

    def recency_score(self) -> float:
        """
        Recency score in range (0, 1].
        Decays as the notification ages. Score = 1 / (1 + hours_elapsed).
        A notification from now → score ≈ 1.0
        A notification from 24h ago → score ≈ 0.04
        """
        now = datetime.now(tz=timezone.utc)
        ts  = self.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        hours_elapsed = max(0.0, (now - ts).total_seconds() / 3600)
        return 1.0 / (1.0 + hours_elapsed)

    def priority_score(self) -> float:
        """
        Composite priority score combining type weight and recency.
        Higher = more important.
        """
        type_w    = TYPE_WEIGHTS.get(self.type, 0)
        type_norm = type_w / max(TYPE_WEIGHTS.values())   # normalise to [0,1]
        recency   = self.recency_score()
        score     = (type_norm * W_TYPE) + (recency * W_RECENCY)
        return round(score, 6)


# ── Priority Heap ─────────────────────────────────────────────────────────────

class PriorityInbox:
    """
    Maintains top-N notifications by priority using a min-heap.
    Heap invariant: heap[0] is the item with LOWEST priority among top-N.
    This allows O(log N) insertion while keeping the heap bounded at size N.
    """

    def __init__(self, n: int = 10):
        self.n      = n
        self._heap: list[tuple[float, int, Notification]] = []
        self._counter = 0   # tie-breaker for equal scores
        logger.info(f"PriorityInbox initialised with N={n}")

    def push(self, notification: Notification) -> None:
        score = notification.priority_score()
        entry = (score, self._counter, notification)
        self._counter += 1

        if len(self._heap) < self.n:
            heapq.heappush(self._heap, entry)
            logger.debug(
                f"Added to heap: id={notification.id[:8]}... "
                f"type={notification.type} score={score:.4f} "
                f"heap_size={len(self._heap)}"
            )
        elif score > self._heap[0][0]:
            evicted = heapq.heapreplace(self._heap, entry)
            logger.debug(
                f"Replaced: new id={notification.id[:8]}... score={score:.4f} "
                f"evicted id={evicted[2].id[:8]}... score={evicted[0]:.4f}"
            )
        else:
            logger.debug(
                f"Discarded: id={notification.id[:8]}... score={score:.4f} "
                f"< min_heap_score={self._heap[0][0]:.4f}"
            )

    def top_n(self) -> list[Notification]:
        """Return top-N notifications sorted by descending priority."""
        return [
            entry[2]
            for entry in sorted(self._heap, key=lambda e: -e[0])
        ]

    def __len__(self) -> int:
        return len(self._heap)


# ── API Client ────────────────────────────────────────────────────────────────

def fetch_notifications() -> list[Notification]:
    logger.info(f"Fetching notifications from {API_URL}")
    req = urllib.request.Request(API_URL, headers=API_HEADERS)
    body = None
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            body   = resp.read().decode("utf-8")
            logger.info(f"API response status: {status}")
            logger.debug(f"Raw response body (first 200 chars): {body[:200]}")
    except Exception as exc:
        logger.error(f"Failed to fetch notifications from API: {exc}")
        logger.info("Falling back to local mock_notifications.json")
        try:
            mock_path = os.path.join(os.path.dirname(__file__), "mock_notifications.json")
            if os.path.exists(mock_path):
                with open(mock_path, "r", encoding="utf-8") as f:
                    body = f.read()
            else:
                logger.error(f"Mock file not found at {mock_path}")
                raise
        except Exception as mock_exc:
            logger.error(f"Failed to read mock data: {mock_exc}")
            raise

    if body is None:
        raise Exception("No data available (API failed and no mock data)")

    data = json.loads(body)
    raw_list: list[dict] = data.get("notifications", [])
    logger.info(f"Received {len(raw_list)} notifications")

    notifications: list[Notification] = []
    for raw in raw_list:
        ts_str = raw.get("Timestamp", raw.get("timestamp", ""))
        try:
            ts = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S").replace(
                tzinfo=timezone.utc
            )
        except ValueError:
            logger.warning(f"Could not parse timestamp '{ts_str}', using now()")
            ts = datetime.now(tz=timezone.utc)

        notif = Notification(
            id        = raw.get("ID", raw.get("id", "")),
            type      = raw.get("Type", raw.get("type", "Event")),
            message   = raw.get("Message", raw.get("message", "")),
            timestamp = ts,
        )
        notifications.append(notif)
        logger.debug(
            f"Parsed notification: id={notif.id[:8]}... "
            f"type={notif.type} message='{notif.message}' ts={ts_str}"
        )

    return notifications


# ── Display ───────────────────────────────────────────────────────────────────

RANK_ICONS = {
    "Placement": "🏢",
    "Result":    "📊",
    "Event":     "🎉",
}

def display_priority_inbox(notifications: list[Notification], n: int) -> None:
    sep = "─" * 70
    print(f"\n{'═' * 70}")
    print(f"  🔔  PRIORITY INBOX  ─  Top {n} Notifications")
    print(f"{'═' * 70}")

    for rank, notif in enumerate(notifications, start=1):
        score  = notif.priority_score()
        recency = notif.recency_score()
        tw     = TYPE_WEIGHTS.get(notif.type, 0)
        icon   = RANK_ICONS.get(notif.type, "📌")
        ts     = notif.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")

        print(f"\n  #{rank:<3} {icon}  [{notif.type.upper()}]")
        print(f"  {sep}")
        print(f"  Message  : {notif.message}")
        print(f"  ID       : {notif.id}")
        print(f"  Time     : {ts}")
        print(f"  Score    : {score:.4f}  "
              f"(type_weight={tw}, recency={recency:.4f})")

    print(f"\n{'═' * 70}\n")
    logger.info(f"Displayed top {len(notifications)} priority notifications")


# ── Main ──────────────────────────────────────────────────────────────────────

def main(n: int = 10) -> None:
    logger.info("=" * 60)
    logger.info("Priority Inbox — Stage 6")
    logger.info(f"N={n}, W_TYPE={W_TYPE}, W_RECENCY={W_RECENCY}")
    logger.info("=" * 60)

    notifications = fetch_notifications()

    inbox = PriorityInbox(n=n)
    for notif in notifications:
        inbox.push(notif)

    logger.info(f"Heap built: {len(inbox)} notifications in top-{n}")

    top = inbox.top_n()
    display_priority_inbox(top, n)

    # Demonstrate streaming: simulate 3 new high-priority notifications arriving
    logger.info("Simulating 3 new streaming notifications …")
    new_notifications = [
        Notification(
            id        = "stream-0001",
            type      = "Placement",
            message   = "Google SWE — Internship 2026 (just posted)",
            timestamp = datetime.now(tz=timezone.utc),
        ),
        Notification(
            id        = "stream-0002",
            type      = "Result",
            message   = "Semester final results published",
            timestamp = datetime.now(tz=timezone.utc),
        ),
        Notification(
            id        = "stream-0003",
            type      = "Event",
            message   = "Farewell ceremony — Hall A at 5 PM today",
            timestamp = datetime.now(tz=timezone.utc),
        ),
    ]

    for new_notif in new_notifications:
        logger.info(f"New notification arrived: {new_notif.id} type={new_notif.type}")
        inbox.push(new_notif)

    print("\n  ── After streaming 3 new notifications ──")
    top_updated = inbox.top_n()
    display_priority_inbox(top_updated, n)


if __name__ == "__main__":
    n_arg = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    main(n=n_arg)
