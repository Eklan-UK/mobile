import { AppText, BoldText } from '@/components/ui';
import { getNotificationStyle } from '@/components/notifications/notification-styles';
import tw from '@/lib/tw';
import type { AppNotification } from '@/types/notifications';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
  type ListRenderItem,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { brandColors } from '@/constants/theme-tokens';
import type { ReactElement } from 'react';

interface NotificationListProps {
  notifications: AppNotification[];
  variant: 'compact' | 'full';
  isLoading?: boolean;
  filter?: 'all' | 'unread';
  onPress: (notification: AppNotification) => void;
  onDelete?: (id: string) => void;
  refreshControl?: ReactElement<RefreshControlProps>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** When true, renders rows in a View (for bottom sheets). */
  embedded?: boolean;
}

function formatRelativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function NotificationRow({
  notification,
  variant,
  onPress,
  onDelete,
}: {
  notification: AppNotification;
  variant: 'compact' | 'full';
  onPress: (notification: AppNotification) => void;
  onDelete?: (id: string) => void;
}) {
  const style = getNotificationStyle(notification.type);
  const isUnread = !notification.isRead;
  const isCompact = variant === 'compact';
  const iconSize = isCompact ? 36 : 48;
  const iconFontSize = isCompact ? 18 : 22;

  return (
    <TouchableOpacity
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
      style={[
        tw`flex-row items-start gap-3 px-4 py-3`,
        isUnread && tw`bg-blue-50/50 dark:bg-blue-950/20`,
        !isCompact && isUnread && tw`border-l-4 border-blue-500 pl-3`,
      ]}
    >
      <View
        style={[
          tw`items-center justify-center rounded-full flex-shrink-0`,
          { width: iconSize, height: iconSize, backgroundColor: style.bgColor },
        ]}
      >
        <AppText style={{ fontSize: iconFontSize }}>{style.icon}</AppText>
      </View>

      <View style={tw`flex-1 min-w-0`}>
        <View style={tw`flex-row items-start justify-between gap-2`}>
          <BoldText
            style={[
              tw`text-sm text-neutral-900 dark:text-white flex-1`,
              isUnread && tw`font-bold`,
            ]}
            numberOfLines={2}
          >
            {notification.title}
          </BoldText>
          {!isCompact && isUnread ? (
            <View style={tw`bg-blue-500 px-2 py-0.5 rounded-full`}>
              <AppText style={tw`text-[10px] text-white font-semibold`}>New</AppText>
            </View>
          ) : null}
        </View>

        <AppText
          style={tw`text-sm text-neutral-600 dark:text-neutral-400 mt-0.5`}
          numberOfLines={isCompact ? 2 : 4}
        >
          {notification.body}
        </AppText>

        <AppText style={tw`text-xs text-neutral-400 dark:text-neutral-500 mt-1`}>
          {formatRelativeTime(notification.createdAt)}
        </AppText>
      </View>

      {isCompact && isUnread ? (
        <View style={tw`w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0`} />
      ) : null}

      {onDelete ? (
        <TouchableOpacity
          onPress={() => onDelete(notification._id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={tw`p-1 flex-shrink-0`}
          accessibilityLabel="Delete notification"
        >
          <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

function EmptyState({ filter }: { filter?: 'all' | 'unread' }) {
  const message =
    filter === 'unread' ? 'No unread notifications' : 'No notifications yet';

  return (
    <View style={tw`flex-1 items-center justify-center py-16 px-8`}>
      <View style={tw`w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center mb-4`}>
        <Ionicons name="notifications-outline" size={32} color="#9CA3AF" />
      </View>
      <BoldText style={tw`text-base text-neutral-900 dark:text-white text-center`}>
        {message}
      </BoldText>
    </View>
  );
}

export function NotificationList({
  notifications,
  variant,
  isLoading = false,
  filter = 'all',
  onPress,
  onDelete,
  refreshControl,
  contentContainerStyle,
  embedded = false,
}: NotificationListProps) {
  if (isLoading && notifications.length === 0) {
    return (
      <View style={tw`flex-1 items-center justify-center py-16`}>
        <ActivityIndicator size="large" color={brandColors.primary} />
      </View>
    );
  }

  if (embedded) {
    if (notifications.length === 0) {
      return <EmptyState filter={filter} />;
    }

    return (
      <View style={contentContainerStyle}>
        {notifications.map((item, index) => (
          <View key={item._id}>
            {index > 0 ? (
              <View style={tw`h-px bg-neutral-100 dark:bg-neutral-800 mx-4`} />
            ) : null}
            <NotificationRow
              notification={item}
              variant={variant}
              onPress={onPress}
              onDelete={onDelete}
            />
          </View>
        ))}
      </View>
    );
  }

  const renderItem: ListRenderItem<AppNotification> = ({ item }) => (
    <NotificationRow
      notification={item}
      variant={variant}
      onPress={onPress}
      onDelete={onDelete}
    />
  );

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      ItemSeparatorComponent={() => (
        <View style={tw`h-px bg-neutral-100 dark:bg-neutral-800 mx-4`} />
      )}
      ListEmptyComponent={<EmptyState filter={filter} />}
      refreshControl={refreshControl}
      contentContainerStyle={[
        notifications.length === 0 ? tw`flex-grow` : tw`pb-4`,
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
    />
  );
}
