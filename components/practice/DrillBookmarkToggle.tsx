import { DrillBookmarkButton } from '@/components/practice/DrillBookmarkButton';
import { useToggleDrillBookmark } from '@/hooks/useToggleDrillBookmark';

export interface DrillBookmarkToggleProps {
  drillId: string;
  hasBookmarks?: boolean;
}

/** Bookmark icon with toggle mutation — safe to render inside drill list rows. */
export function DrillBookmarkToggle({ drillId, hasBookmarks = false }: DrillBookmarkToggleProps) {
  const { toggle, isPending } = useToggleDrillBookmark(drillId, hasBookmarks);

  return (
    <DrillBookmarkButton
      hasBookmarks={hasBookmarks}
      loading={isPending}
      disabled={isPending}
      onPress={toggle}
    />
  );
}
