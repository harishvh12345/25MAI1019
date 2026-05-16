// src/lib/types.ts

export type NotificationType = 'Placement' | 'Result' | 'Event';

export interface Notification {
  ID: string;
  Type: NotificationType;
  Message: string;
  Timestamp: string;
}

export interface NotificationsApiResponse {
  notifications: Notification[];
}

export const TYPE_WEIGHTS: Record<NotificationType, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

export const W_TYPE = 0.6;
export const W_RECENCY = 0.4;

export function getRecencyScore(timestamp: string): number {
  const now = Date.now();
  const ts = new Date(timestamp.replace(' ', 'T') + 'Z').getTime();
  const hoursElapsed = Math.max(0, (now - ts) / (1000 * 60 * 60));
  return 1 / (1 + hoursElapsed);
}

export function getPriorityScore(notification: Notification): number {
  const typeW = TYPE_WEIGHTS[notification.Type] ?? 0;
  const typeNorm = typeW / Math.max(...Object.values(TYPE_WEIGHTS));
  const recency = getRecencyScore(notification.Timestamp);
  return typeNorm * W_TYPE + recency * W_RECENCY;
}

export function getTopN(notifications: Notification[], n: number): Notification[] {
  return [...notifications]
    .sort((a, b) => getPriorityScore(b) - getPriorityScore(a))
    .slice(0, n);
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp.replace(' ', 'T') + 'Z');
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function timeAgo(timestamp: string): string {
  const date = new Date(timestamp.replace(' ', 'T') + 'Z');
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export const TYPE_COLORS: Record<NotificationType, string> = {
  Placement: '#1565c0',
  Result: '#6a1b9a',
  Event: '#e65100',
};

export const TYPE_BG_COLORS: Record<NotificationType, string> = {
  Placement: '#e3f2fd',
  Result: '#f3e5f5',
  Event: '#fff3e0',
};

export const TYPE_ICONS: Record<NotificationType, string> = {
  Placement: '🏢',
  Result: '📊',
  Event: '🎉',
};
