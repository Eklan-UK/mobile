import { useState, useEffect, useCallback } from "react";
import { Alert } from "@/utils/alert";
import { saveDrill, unsaveDrill, checkDrillSaved } from "@/services/drill.service";
import { logger } from "@/utils/logger";

export function useSaveDrill(drillId: string) {
  const [isSaved, setIsSaved] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const checkSavedStatus = useCallback(async () => {
    if (!drillId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const savedStatus = await checkDrillSaved(drillId);
      setIsSaved(savedStatus.isSaved);
      setBookmarkId(savedStatus.bookmarkId);
    } catch (error) {
      logger.error("Failed to check saved status:", error);
    } finally {
      setLoading(false);
    }
  }, [drillId]);

  useEffect(() => {
    if (drillId) {
      checkSavedStatus();
    } else {
      setLoading(false);
    }
  }, [drillId, checkSavedStatus]);

  const handleSave = async () => {
    try {
      await saveDrill(drillId);
      await checkSavedStatus();
    } catch (error: any) {
      Alert.alert("Error", "Failed to save drill. Please try again.");
    }
  };

  const handleUnsave = async () => {
    if (!bookmarkId) return;
    try {
      await unsaveDrill(bookmarkId);
      setIsSaved(false);
      setBookmarkId(undefined);
    } catch (error: any) {
      Alert.alert("Error", "Failed to unsave drill. Please try again.");
    }
  };

  return {
    isSaved,
    bookmarkId,
    loading,
    handleSave,
    handleUnsave,
    refresh: checkSavedStatus,
  };
}

