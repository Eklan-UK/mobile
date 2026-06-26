import { BadgeUnlockModal } from '@/components/badges/badge-unlock-modal';
import { invalidateLearnerActivityCaches } from '@/hooks/invalidateLearnerActivityCaches';
import { registerBadgeUnlockHandler } from '@/lib/badges/celebrate-badge-unlock';
import type { BadgeUnlockCelebration } from '@/types/badge.types';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface BadgeUnlockContextValue {
  celebrateBadges: (items: BadgeUnlockCelebration[]) => void;
}

const BadgeUnlockContext = createContext<BadgeUnlockContextValue | null>(null);

export function useBadgeUnlock() {
  const context = useContext(BadgeUnlockContext);
  if (!context) {
    throw new Error('useBadgeUnlock must be used within BadgeUnlockProvider');
  }
  return context;
}

export function BadgeUnlockProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<BadgeUnlockCelebration[]>([]);
  const hasRefreshedRef = useRef(false);

  const current = queue[0] ?? null;
  const isVisible = current !== null;

  const celebrateBadges = useCallback(
    (items: BadgeUnlockCelebration[]) => {
      if (!items.length) return;

      setQueue((prev) => [...prev, ...items]);

      if (!hasRefreshedRef.current) {
        hasRefreshedRef.current = true;
        void invalidateLearnerActivityCaches(queryClient);
      }
    },
    [queryClient]
  );

  const dismissCurrent = useCallback(() => {
    setQueue((prev) => {
      const next = prev.slice(1);
      if (next.length === 0) {
        hasRefreshedRef.current = false;
      }
      return next;
    });
  }, []);

  const handleViewBadges = useCallback(() => {
    setQueue([]);
    hasRefreshedRef.current = false;
    router.push('/badges');
  }, []);

  useEffect(() => {
    registerBadgeUnlockHandler(celebrateBadges);
    return () => registerBadgeUnlockHandler(null);
  }, [celebrateBadges]);

  return (
    <BadgeUnlockContext.Provider value={{ celebrateBadges }}>
      {children}
      {current ? (
        <BadgeUnlockModal
          visible={isVisible}
          badge={current}
          onDismiss={dismissCurrent}
          onViewBadges={handleViewBadges}
        />
      ) : null}
    </BadgeUnlockContext.Provider>
  );
}
