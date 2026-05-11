// ─── Preference types ─────────────────────────────────────────────────────────

export interface LessonPreferences {
  eklanTalks?: boolean;
  chatTranslation?: boolean;
  englishAccent?: string;
  voiceTone?: string;
  speakingSpeed?: string;
}

export interface NotificationPreferences {
  learningReminders: boolean;
  specialOffers: boolean;
  subscriptionExpires: boolean;
}

export type ThemeValue = 'system' | 'light' | 'dark';

export type LearningGoalId =
  | 'business_english'
  | 'everyday_conversation'
  | 'travel_english'
  | 'academic_english'
  | 'job_interview'
  | 'pronunciation';

export interface LanguageOption {
  locale: string;
  name: string;
  native: string;
}

export interface NationalityOption {
  id: string;
  name: string;
  native: string;
  flag: string;
}

export interface LearningGoalOption {
  id: string;
  text: string;
  icon: string;
}

// ─── Preferences request body (mirrors §6 of MOBILE_SETTINGS.md) ──────────────

export interface PreferencesBody {
  nationality?: string;
  language?: string;
  learningGoal?: string;
  learningGoals?: string[];
  theme?: ThemeValue;
  notificationPreferences?: NotificationPreferences;
  lessonPreferences?: LessonPreferences;
}

// ─── API envelope types ────────────────────────────────────────────────────────

export type ApiErrorCode =
  | 'ValidationError'
  | 'InvalidPasswordError'
  | 'NoPasswordError'
  | 'AuthenticationError'
  | 'NotFoundError'
  | 'AlreadyVerified'
  | 'ServerError'
  | 'Success';

export interface ApiEnvelope<T = unknown> {
  code: ApiErrorCode;
  message: string;
  data?: T;
  errors?: { path: string[]; message: string }[];
}

export interface SettingsApiError extends Error {
  code: ApiErrorCode;
  errors?: { path: string[]; message: string }[];
}

// ─── Current user response types ──────────────────────────────────────────────

export interface UserProfile {
  id: string;
  userId: string;
  nationality?: string;
  language?: string;
  learningGoal?: string;
  learningGoals?: string[];
  notificationPreferences?: NotificationPreferences;
  lessonPreferences?: LessonPreferences;
}

export interface UserCurrentResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    username?: string;
    avatar?: string;
    emailVerified?: boolean;
    isEmailVerified?: boolean;
    subscriptionPlan?: 'free' | 'premium';
    isSubscribed?: boolean;
    subscriptionExpiresAt?: string | null;
    hasProfile?: boolean;
  };
  profile?: UserProfile;
}

// ─── Default values ────────────────────────────────────────────────────────────

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  learningReminders: true,
  specialOffers: false,
  subscriptionExpires: true,
};

export const DEFAULT_LESSON_PREFERENCES: LessonPreferences = {
  eklanTalks: true,
  chatTranslation: false,
  englishAccent: 'british',
  voiceTone: 'friendly',
  speakingSpeed: 'normal',
};
