import {
  buildSaveCheckpointBody,
  clearCheckpointSafe,
  shouldCheckpoint,
} from '@/lib/drill/drill-checkpoint';
import {
  getCheckpoint,
  saveCheckpoint,
} from '@/services/drill.service';
import type {
  DrillCheckpoint,
  DrillCheckpointPartialResults,
  DrillCheckpointType,
  PartialResultsForDrillType,
} from '@/types/drill-checkpoint.types';
import { logger } from '@/utils/logger';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseDrillCheckpointOptions<
  TType extends DrillCheckpointType,
> {
  drillId: string;
  assignmentId: string | undefined;
  drillType: TType;
  isRedo?: boolean;
  isWeeklyChallenge?: boolean;
  isDrillReady: boolean;
  totalItems: number;
  onHydrate: (checkpoint: DrillCheckpoint<PartialResultsForDrillType<TType>>) => void;
  onFreshStart: () => void;
}

export function useDrillCheckpoint<TType extends DrillCheckpointType>({
  drillId,
  assignmentId,
  drillType,
  isRedo = false,
  isWeeklyChallenge = false,
  isDrillReady,
  totalItems,
  onHydrate,
  onFreshStart,
}: UseDrillCheckpointOptions<TType>) {
  const [isLoadingCheckpoint, setIsLoadingCheckpoint] = useState(false);
  const [showCheckpointScreen, setShowCheckpointScreen] = useState(false);
  const [checkpointCompletedCount, setCheckpointCompletedCount] = useState(0);
  const startedAtRef = useRef<string | undefined>(undefined);

  const onHydrateRef = useRef(onHydrate);
  const onFreshStartRef = useRef(onFreshStart);
  onHydrateRef.current = onHydrate;
  onFreshStartRef.current = onFreshStart;

  const sessionKey = `${drillId}-${assignmentId ?? 'pending'}`;
  const checkpointsEnabled =
    !!assignmentId && !isRedo && !isWeeklyChallenge;
  const skipLocalRestore = checkpointsEnabled;

  useEffect(() => {
    startedAtRef.current = undefined;
    setShowCheckpointScreen(false);
    setCheckpointCompletedCount(0);
  }, [drillId, assignmentId, sessionKey]);

  useEffect(() => {
    let cancelled = false;

    if (!checkpointsEnabled) {
      setIsLoadingCheckpoint(false);
      return () => {
        cancelled = true;
      };
    }

    if (!isDrillReady) {
      setIsLoadingCheckpoint(true);
      return () => {
        cancelled = true;
      };
    }

    setIsLoadingCheckpoint(true);

    void (async () => {
      try {
        const checkpoint = await getCheckpoint(drillId, assignmentId!);
        if (cancelled) return;

        if (checkpoint) {
          onHydrateRef.current(
            checkpoint as DrillCheckpoint<PartialResultsForDrillType<TType>>
          );
          setCheckpointCompletedCount(checkpoint.completedItemCount);
          if (checkpoint.startedAt) {
            startedAtRef.current = checkpoint.startedAt;
          }
        } else {
          onFreshStartRef.current();
        }
      } catch (error) {
        if (cancelled) return;
        logger.warn('Failed to load drill checkpoint, starting fresh:', error);
        onFreshStartRef.current();
      } finally {
        if (!cancelled) {
          setIsLoadingCheckpoint(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    drillId,
    assignmentId,
    sessionKey,
    checkpointsEnabled,
    isDrillReady,
  ]);

  const saveCheckpointAtBoundary = useCallback(
    async (
      partialResults: PartialResultsForDrillType<TType>,
      completedCount: number,
      currentIndex?: number
    ) => {
      if (!checkpointsEnabled || !shouldCheckpoint(completedCount)) return;

      const index = currentIndex ?? completedCount - 1;

      if (!startedAtRef.current) {
        startedAtRef.current = new Date().toISOString();
      }

      try {
        const body = buildSaveCheckpointBody({
          assignmentId: assignmentId!,
          drillType,
          currentIndex: index,
          completedItemCount: completedCount,
          partialResults: partialResults as DrillCheckpointPartialResults,
          startedAt: startedAtRef.current,
        });
        await saveCheckpoint(drillId, body);
        setCheckpointCompletedCount(completedCount);
        setShowCheckpointScreen(true);
      } catch (error) {
        logger.warn('Failed to save drill checkpoint:', error);
      }
    },
    [assignmentId, checkpointsEnabled, drillId, drillType]
  );

  const dismissCheckpoint = useCallback(() => {
    setShowCheckpointScreen(false);
  }, []);

  const clearCheckpoint = useCallback(() => {
    if (!checkpointsEnabled) return;
    clearCheckpointSafe(drillId, assignmentId!);
  }, [assignmentId, checkpointsEnabled, drillId]);

  return {
    isLoadingCheckpoint,
    showCheckpointScreen,
    checkpointCompletedCount,
    dismissCheckpoint,
    saveCheckpointAtBoundary,
    clearCheckpoint,
    startedAtRef,
    sessionKey,
    skipLocalRestore,
    checkpointsEnabled,
    totalItems,
  };
}
