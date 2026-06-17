import { brandColors } from '@/constants/theme-tokens';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, TouchableOpacity } from 'react-native';

export interface DrillBookmarkButtonProps {
  hasBookmarks: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function DrillBookmarkButton({
  hasBookmarks,
  loading = false,
  disabled = false,
  onPress,
}: DrillBookmarkButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={hasBookmarks ? 'Remove bookmark' : 'Add bookmark'}
    >
      {loading ? (
        <ActivityIndicator size="small" color={brandColors.primaryDark} />
      ) : (
        <Ionicons
          name={hasBookmarks ? 'bookmark' : 'bookmark-outline'}
          size={22}
          color={hasBookmarks ? brandColors.primaryDark : '#9CA3AF'}
        />
      )}
    </TouchableOpacity>
  );
}
