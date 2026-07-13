export interface NotificationStyle {
  icon: string;
  bgColor: string;
}

export const notificationStyles: Record<string, NotificationStyle> = {
  drill_assigned: { icon: '📚', bgColor: '#DBEAFE' },
  drill_reminder: { icon: '⏰', bgColor: '#FEF3C7' },
  drill_reviewed: { icon: '✅', bgColor: '#DCFCE7' },
  drill_completed: { icon: '📝', bgColor: '#DCFCE7' },
  daily_focus: { icon: '🎯', bgColor: '#E0E7FF' },
  achievement: { icon: '🏆', bgColor: '#FEF9C3' },
  message: { icon: '💬', bgColor: '#CFFAFE' },
  tutor_update: { icon: '👨‍🏫', bgColor: '#FCE7F3' },
  class_session_reminder: { icon: '📅', bgColor: '#EDE9FE' },
  class_nps_form: { icon: '⭐', bgColor: '#FFEDD5' },
  weekly_drill_digest: { icon: '🗓️', bgColor: '#CCFBF1' },
  weekly_challenge_ready: { icon: '🏆', bgColor: '#FEF3C7' },
  system: { icon: '📢', bgColor: '#F3F4F6' },
};

export function getNotificationStyle(type: string): NotificationStyle {
  return notificationStyles[type] ?? notificationStyles.system;
}
