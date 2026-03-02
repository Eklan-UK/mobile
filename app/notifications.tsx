import React, { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { BoldText } from '@/components/ui/BoldText';
import Logo from '@/assets/icons/logo.svg';

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + ' minute' + (diffMins === 1 ? '' : 's') + ' ago';
  if (diffHours < 24) return diffHours + ' hour' + (diffHours === 1 ? '' : 's') + ' ago';
  if (diffDays === 1) return 'Yesterday, ' + formatTime(date);
  if (diffDays < 7) return diffDays + ' days ago, ' + formatTime(date);

  return (
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) +
    ' ' +
    formatTime(date)
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/* ─────────────────────────────────────────────────────────────
   Mock data — replace with real API / zustand store later
───────────────────────────────────────────────────────────── */
const TWO_DAYS_AGO = new Date(
  Date.now() - 2 * 24 * 60 * 60 * 1000 + 22 * 60 * 60 * 1000 + 25 * 60 * 1000
).toISOString();

const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: '1',
    title: 'Subscription offer',
    body: "Do any of the week's sessions today to start a new streak.",
    createdAt: TWO_DAYS_AGO,
    read: true,
  },
  {
    id: '2',
    title: "Let's Start Your first Streak Today",
    body: "Do any of the week's session today to start a new streak.",
    createdAt: new Date('2025-11-13T10:11:00').toISOString(),
    read: false,
  },
];

/* ─────────────────────────────────────────────────────────────
   Single Notification Row
───────────────────────────────────────────────────────────── */
const NotificationRow: React.FC<{
  item: AppNotification;
  onPress: (id: string) => void;
}> = ({ item, onPress }) => (
  <TouchableOpacity
    onPress={() => onPress(item.id)}
    activeOpacity={0.7}
    style={[styles.row, !item.read && styles.rowUnread]}
  >
    {/* Logo icon */}
    <View style={[styles.iconWrapper, tw`dark:bg-green-900/30 dark:border-green-800/50`]}>
      <Logo width={22} height={22} />
    </View>

    {/* Text content */}
    <View style={styles.rowText}>
      <BoldText style={[styles.rowTitle, tw`dark:text-white`]} numberOfLines={2}>
        {item.title}
      </BoldText>
      <AppText style={[styles.rowBody, tw`dark:text-neutral-400`]} numberOfLines={3}>
        {item.body}
      </AppText>
      <AppText style={[styles.rowTime, tw`dark:text-neutral-500`]}>
        {formatNotificationTime(item.createdAt)}
      </AppText>
    </View>

    {/* Unread dot */}
    {!item.read && <View style={styles.unreadDot} />}
  </TouchableOpacity>
);

/* ─────────────────────────────────────────────────────────────
   Empty State
───────────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrapper, tw`dark:bg-green-900/30`]}>
        <Logo width={36} height={36} />
      </View>
      <BoldText style={[styles.emptyTitle, tw`dark:text-white`]}>No notifications yet</BoldText>
      <AppText style={[styles.emptyBody, tw`dark:text-neutral-400`]}>
        {"We'll let you know when something important happens."}
      </AppText>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
   Screen
───────────────────────────────────────────────────────────── */
export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);

  const handlePress = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, tw`dark:bg-neutral-900`]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={[styles.backIconWrap, tw`dark:bg-neutral-800`]}>
            <View style={[styles.chevron, tw`dark:border-white`]} />
          </View>
        </TouchableOpacity>

        <AppText style={[styles.headerTitle, tw`dark:text-white`]}>Notification</AppText>

        {/* Right spacer to keep title centered */}
        <View style={styles.backButton} />
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationRow item={item} onPress={handlePress} />
        )}
        ItemSeparatorComponent={() => <View style={[styles.separator, tw`dark:bg-neutral-800`]} />}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyListContent : styles.listContent
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────────────────────────
   Styles
───────────────────────────────────────────────────────────── */
import tw from '@/lib/tw';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
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

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
  },
  emptyListContent: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    gap: 14,
  },
  rowUnread: {},
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FFF4',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
    color: '#111111',
    lineHeight: 20,
  },
  rowBody: {
    fontSize: 14,
    fontFamily: 'Satoshi-Regular',
    color: '#444444',
    lineHeight: 20,
  },
  rowTime: {
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    color: '#AAAAAA',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B883E',
    marginTop: 6,
    flexShrink: 0,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 58,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0FFF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#111111',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: 'Satoshi-Regular',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
  },
});
