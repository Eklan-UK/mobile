import { NotificationList } from '@/components/notifications/NotificationList';
import { AppText, BoldText } from '@/components/ui';
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
} from '@/hooks/useNotifications';
import { navigateFromNotification } from '@/lib/notifications/deep-links';
import tw from '@/lib/tw';
import type { AppNotification } from '@/types/notifications';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FilterTab = 'all' | 'unread';

export default function NotificationsScreen() {
  const [filter, setFilter] = useState<FilterTab>('all');
  const { data, isLoading, isRefetching, refetch } = useNotificationsList(filter);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleNotificationPress = useCallback(
    async (notification: AppNotification) => {
      if (!notification.isRead) {
        try {
          await markRead.mutateAsync(notification._id);
        } catch {
          // Continue navigation even if mark-read fails
        }
      }
      await navigateFromNotification(notification.data);
    },
    [markRead]
  );

  const handleDelete = useCallback(
    (notificationId: string) => {
      deleteNotification.mutate(notificationId);
    },
    [deleteNotification]
  );

  const handleMarkAllRead = useCallback(() => {
    if (unreadCount === 0 || markAllRead.isPending) return;
    markAllRead.mutate();
  }, [markAllRead, unreadCount]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, tw`dark:bg-neutral-900`]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
        >
          <View style={[styles.backIconWrap, tw`dark:bg-neutral-800`]}>
            <View style={[styles.chevron, tw`dark:border-white`]} />
          </View>
        </TouchableOpacity>

        <AppText style={[styles.headerTitle, tw`dark:text-white`]}>Notifications</AppText>

        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={markAllRead.isPending}
            style={styles.markAllButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText style={tw`text-xs font-semibold text-green-700 dark:text-green-400`}>
              Mark all read
            </AppText>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setFilter('all')}
          style={[styles.tab, filter === 'all' && styles.tabActive]}
        >
          <BoldText
            style={[
              styles.tabText,
              filter === 'all' && styles.tabTextActive,
              tw`dark:text-neutral-300`,
            ]}
          >
            All
          </BoldText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter('unread')}
          style={[styles.tab, filter === 'unread' && styles.tabActive]}
        >
          <BoldText
            style={[
              styles.tabText,
              filter === 'unread' && styles.tabTextActive,
              tw`dark:text-neutral-300`,
            ]}
          >
            {unreadCount > 0 ? `Unread (${unreadCount})` : 'Unread'}
          </BoldText>
        </TouchableOpacity>
      </View>

      <NotificationList
        notifications={notifications}
        variant="full"
        isLoading={isLoading}
        filter={filter}
        onPress={handleNotificationPress}
        onDelete={handleDelete}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Nunito-Bold',
    color: '#111111',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllButton: {
    maxWidth: 88,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 9,
    height: 9,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#111111',
    transform: [{ rotate: '45deg' }, { translateX: 2 }],
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  tabActive: {
    backgroundColor: '#DCFCE7',
  },
  tabText: {
    fontSize: 13,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#15803D',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexGrow: 1,
  },
});
