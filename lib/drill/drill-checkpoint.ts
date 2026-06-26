import { clearCheckpoint } from '@/services/drill.service';
import type {
  DrillCheckpointPartialResults,
  DrillCheckpointType,
  SaveCheckpointBody,
} from '@/types/drill-checkpoint.types';
import { logger } from '@/utils/logger';

export const CHECKPOINT_INTERVAL = 5;

export function shouldCheckpoint(completedCount: number): boolean {
  return completedCount > 0 && completedCount % CHECKPOINT_INTERVAL === 0;
}

export function buildSaveCheckpointBody<
  TPartial extends DrillCheckpointPartialResults,
>(params: {
  assignmentId: string;
  drillType: DrillCheckpointType;
  currentIndex: number;
  completedItemCount: number;
  partialResults: TPartial;
  startedAt?: string;
}): SaveCheckpointBody<TPartial> {
  return {
    assignmentId: params.assignmentId,
    drillType: params.drillType,
    resumeFromIndex: params.currentIndex + 1,
    completedItemCount: params.completedItemCount,
    partialResults: params.partialResults,
    ...(params.startedAt ? { startedAt: params.startedAt } : {}),
  };
}

export function clearCheckpointSafe(
  drillId: string,
  assignmentId: string
): void {
  void clearCheckpoint(drillId, assignmentId).catch((error) => {
    logger.warn(
      'Failed to clear drill checkpoint (non-critical):',
      error instanceof Error ? error.message : error
    );
  });
}
