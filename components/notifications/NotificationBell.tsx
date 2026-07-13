import BellIcon from '@/assets/icons/bell.svg';
import { NotificationList } from '@/components/notifications/NotificationList';
import { AppText, BoldText } from '@/components/ui';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsBell,
} from '@/hooks/useNotifications';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';
import { navigateFromNotification } from '@/lib/notifications/deep-links';
import tw from '@/lib/tw';
import type { AppNotification } from '@/types/notifications';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brandColors } from '@/constants/theme-tokens';

type NotificationBellVariant = 'home' | 'plan';

interface NotificationBellProps {
  variant?: NotificationBellVariant;
  buttonStyle?: StyleProp<ViewStyle>;
}

export const NotificationBell = memo(function NotificationBell({
  variant = 'home',
  buttonStyle,
}: NotificationBellProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const { colors: c, isDark } = useSemanticTheme();
  const { data, isLoading } = useNotificationsBell();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  const snapPoints = useMemo(() => ['55%', '75%'], []);

  const accessibilityLabel =
    unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications';

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const handleOpen = useCallback(() => {
    sheetRef.current?.present();
  }, []);

  const handleDismiss = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const handleNotificationPress = useCallback(
    async (notification: AppNotification) => {
      if (!notification.isRead) {
        try {
          await markRead.mutateAsync(notification._id);
        } catch {
          // Continue navigation even if mark-read fails
        }
      }
      handleDismiss();
      await navigateFromNotification(notification.data);
    },
    [handleDismiss, markRead]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0 || markAllRead.isPending) return;
    await markAllRead.mutateAsync();
  }, [markAllRead, unreadCount]);

  const handleViewAll = useCallback(() => {
    handleDismiss();
    router.push('/notifications');
  }, [handleDismiss]);

  const bellButtonStyle =
    buttonStyle ??
    (variant === 'plan'
      ? tw`w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center`
      : [
          tw`w-7 h-7 rounded-full items-center justify-center border`,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)',
            borderColor: c.border,
          },
        ]);

  const iconSize = variant === 'plan' ? 18 : 16;

  return (
    <>
      <TouchableOpacity
        style={bellButtonStyle}
        onPress={handleOpen}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <BellIcon width={iconSize} height={iconSize} />
        {unreadCount > 0 ? (
          <View
            style={tw`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 items-center justify-center`}
          >
            <AppText style={tw`text-[10px] text-white font-bold leading-none`}>
              {badgeLabel}
            </AppText>
          </View>
        ) : null}
      </TouchableOpacity>

      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={tw`bg-neutral-300 dark:bg-neutral-600 w-12`}
        backgroundStyle={tw`bg-white dark:bg-neutral-900 rounded-t-3xl`}
      >
        <BottomSheetScrollView
          style={tw`flex-1`}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          <View style={tw`px-5 pt-2 pb-3 flex-row items-center justify-between`}>
            <BoldText style={tw`text-xl text-neutral-900 dark:text-white`}>
              Notifications
            </BoldText>
            {unreadCount > 0 ? (
              <TouchableOpacity
                onPress={handleMarkAllRead}
                disabled={markAllRead.isPending}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {markAllRead.isPending ? (
                  <ActivityIndicator size="small" color={brandColors.primary} />
                ) : (
                  <AppText style={tw`text-sm text-primary-500 font-medium`}>
                    Mark all read
                  </AppText>
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          {isLoading && notifications.length === 0 ? (
            <View style={tw`py-16 items-center`}>
              <ActivityIndicator size="large" color={brandColors.primary} />
            </View>
          ) : (
            <NotificationList
              notifications={notifications}
              variant="compact"
              onPress={handleNotificationPress}
              embedded
            />
          )}

          {notifications.length > 0 ? (
            <TouchableOpacity
              onPress={handleViewAll}
              style={tw`mx-5 mt-2 py-3 items-center border-t border-neutral-100 dark:border-neutral-800`}
            >
              <AppText style={tw`text-sm text-primary-500 font-medium`}>
                View all notifications
              </AppText>
            </TouchableOpacity>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
});
