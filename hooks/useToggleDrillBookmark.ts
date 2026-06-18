import { useNotificationToast } from '@/contexts/NotificationToastContext';
import { invalidateDrillCaches } from '@/hooks/useDrills';
import { saveDrill, unsaveDrillByDrillId } from '@/services/drill.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export function useToggleDrillBookmark(drillId: string, hasBookmarks: boolean) {
  const queryClient = useQueryClient();
  const { showToast } = useNotificationToast();

  const mutation = useMutation({
    mutationFn: async () => {
      if (hasBookmarks) {
        await unsaveDrillByDrillId(drillId);
        return { action: 'removed' as const };
      }
      const result = await saveDrill(drillId);
      const message =
        result?.message ??
        result?.data?.message ??
        (typeof result === 'object' && result !== null
          ? (result as { message?: string }).message
          : undefined);
      if (message === 'Already bookmarked') {
        return { action: 'already' as const };
      }
      return { action: 'added' as const };
    },
    onSuccess: async (result) => {
      await invalidateDrillCaches(queryClient);
      if (result.action === 'already') {
        showToast({
          title: 'Already bookmarked',
          body: '',
          variant: 'dark',
          duration: 3000,
        });
        return;
      }
      showToast({
        title: result.action === 'removed' ? 'Removed from bookmarks' : 'Added to bookmarks!',
        body: '',
        variant: 'dark',
        duration: 3000,
      });
    },
    onError: () => {
      showToast({
        title: hasBookmarks ? 'Could not remove bookmark' : 'Could not save bookmark',
        body: '',
        variant: 'light',
        duration: 3000,
      });
    },
  });

  const toggle = useCallback(() => {
    if (!drillId || mutation.isPending) return;
    mutation.mutate();
  }, [drillId, mutation]);

  return {
    toggle,
    isPending: mutation.isPending,
  };
}
