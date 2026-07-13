export type NotificationType =
  | 'drill_assigned'
  | 'drill_reminder'
  | 'drill_reviewed'
  | 'drill_completed'
  | 'daily_focus'
  | 'achievement'
  | 'message'
  | 'tutor_update'
  | 'system'
  | 'class_session_reminder'
  | 'class_nps_form'
  | 'weekly_drill_digest'
  | 'weekly_challenge_ready';

export interface NotificationData {
  screen?: string;
  resourceId?: string;
  resourceType?: string;
  url?: string;
  assignmentId?: string;
  weekStartDate?: string;
  weekKey?: string;
  sessionId?: string;
  drillId?: string;
  [key: string]: unknown;
}

export interface AppNotification {
  _id: string;
  title: string;
  body: string;
  type: NotificationType | string;
  data?: NotificationData;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
  pagination: {
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

export interface FetchNotificationsParams {
  limit?: number;
  skip?: number;
  unreadOnly?: boolean;
}

/** @alias FetchNotificationsParams */
export type GetNotificationsParams = FetchNotificationsParams;

export interface MarkAllNotificationsReadResponse {
  success: boolean;
  markedCount: number;
}
