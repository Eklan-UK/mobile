export type LearnerBookmarkType = "word" | "sentence" | "drill";

export interface LearnerBookmark {
  _id: string;
  drillId: string;
  type: LearnerBookmarkType;
  content: string;
  translation?: string;
  context?: string;
  createdAt: string;
}
