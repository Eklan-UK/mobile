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
      } else {
        await saveDrill(drillId);
      }
    },
    onSuccess: async () => {
      await invalidateDrillCaches(queryClient);
      showToast({
        title: hasBookmarks ? 'Removed from bookmarks' : 'Added to bookmarks!',
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
