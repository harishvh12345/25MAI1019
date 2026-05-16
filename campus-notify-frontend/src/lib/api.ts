// src/lib/api.ts
import { Notification, NotificationsApiResponse } from './types';

const API_BASE = '/api/notifications';

export interface FetchParams {
  page?: number;
  limit?: number;
  notification_type?: string;
}

export async function fetchNotifications(params: FetchParams = {}): Promise<{
  notifications: Notification[];
  total: number;
}> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.notification_type && params.notification_type !== 'All') {
    searchParams.set('notification_type', params.notification_type);
  }

  const url = `${API_BASE}?${searchParams.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch notifications: ${res.statusText}`);
  }

  const data: NotificationsApiResponse = await res.json();
  return {
    notifications: data.notifications ?? [],
    total: data.notifications?.length ?? 0,
  };
}
