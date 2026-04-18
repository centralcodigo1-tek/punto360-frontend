import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/axios';

export interface AppNotification {
  id: string;
  type: 'warning' | 'info' | 'danger';
  title: string;
  message: string;
  createdAt: string;
}

interface NotificationsResponse {
  count: number;
  notifications: AppNotification[];
}

export function useNotifications(intervalMs = 60_000) {
  const [data, setData] = useState<NotificationsResponse>({ count: 0, notifications: [] });
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get<NotificationsResponse>('/notifications');
      setData(res.data);
    } catch {
      // silent — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, intervalMs);
    return () => clearInterval(interval);
  }, [fetchNotifications, intervalMs]);

  return { ...data, loading, refetch: fetchNotifications };
}
