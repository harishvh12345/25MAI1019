// src/hooks/useViewedNotifications.ts
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'campus_notify_viewed';

export function useViewedNotifications() {
  const [viewed, setViewed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setViewed(new Set(JSON.parse(stored)));
      }
    } catch {
      // ignore
    }
  }, []);

  const markViewed = useCallback((id: string) => {
    setViewed(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const markAllViewed = useCallback((ids: string[]) => {
    setViewed(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const isViewed = useCallback((id: string) => viewed.has(id), [viewed]);

  return { viewed, markViewed, markAllViewed, isViewed };
}
