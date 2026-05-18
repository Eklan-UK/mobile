import apiClient from "@/lib/api";
import type { LearnerBookmark, LearnerBookmarkType } from "@/types/bookmark.types";
import { logger } from "@/utils/logger";

function normalizeBookmark(raw: any): LearnerBookmark {
  return {
    _id: String(raw._id ?? raw.id ?? ""),
    drillId: String(raw.drillId ?? ""),
    type: (raw.type as LearnerBookmarkType) || "word",
    content: String(raw.content ?? ""),
    translation: raw.translation,
    context: raw.context,
    createdAt: String(raw.createdAt ?? raw.created_date ?? ""),
  };
}

/**
 * Word and sentence bookmarks for the learner (newest first from API).
 */
export async function getWordAndSentenceBookmarks(): Promise<LearnerBookmark[]> {
  const response = await apiClient.get("/api/v1/bookmarks");
  const data = response.data?.data ?? response.data;
  const list = data?.bookmarks ?? [];
  if (!Array.isArray(list)) return [];
  return list
    .map(normalizeBookmark)
    .filter((b) => b.type === "word" || b.type === "sentence");
}

export async function getBookmarkById(id: string): Promise<LearnerBookmark> {
  const response = await apiClient.get(`/api/v1/bookmarks/${id}`);
  const data = response.data?.data ?? response.data;
  const raw = data?.bookmark ?? data;
  return normalizeBookmark(raw);
}

export async function deleteBookmark(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/bookmarks/${id}`);
}
