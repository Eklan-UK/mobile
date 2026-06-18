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
      accessibilityLabel={hasBookmarks ? 'Remove from bookmarks' : 'Save to bookmarks'}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#22c55e" />
      ) : (
        <Ionicons
          name={hasBookmarks ? 'bookmark' : 'bookmark-outline'}
          size={20}
          color={hasBookmarks ? '#22c55e' : '#9CA3AF'}
        />
      )}
    </TouchableOpacity>
  );
}
