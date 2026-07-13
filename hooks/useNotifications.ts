import { notificationService } from '@/services/notification.service';
import { useAuthStore } from '@/store/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // Native module may be unavailable in dev / web
}

export const notificationsQueryKey = {
  all: ['notifications'] as const,
  list: (params: { limit: number; unreadOnly: boolean }) =>
    [...notificationsQueryKey.all, params] as const,
};

export type NotificationsListFilter = 'all' | 'unread';

export function useNotificationsBell() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: notificationsQueryKey.list({ limit: 10, unreadOnly: false }),
    queryFn: () => notificationService.getNotifications({ limit: 10 }),
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: isAuthenticated,
  });
}

export function useNotificationsList(filter: NotificationsListFilter) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const unreadOnly = filter === 'unread';

  return useQuery({
    queryKey: notificationsQueryKey.list({ limit: 50, unreadOnly }),
    queryFn: () => notificationService.getNotifications({ limit: 50, unreadOnly }),
    staleTime: 30_000,
    enabled: isAuthenticated,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.markNotificationRead(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllNotificationsRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.deleteNotification(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey.all });
    },
  });
}

/** Sync iOS app icon badge with inbox unread count. */
export function useNotificationBadgeSync() {
  const { data } = useNotificationsBell();
  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => {
    if (Platform.OS !== 'ios' || !Notifications?.setBadgeCountAsync) return;
    Notifications.setBadgeCountAsync(unreadCount).catch((error) => {
      logger.warn('Failed to set notification badge count:', error);
    });
  }, [unreadCount]);
}
