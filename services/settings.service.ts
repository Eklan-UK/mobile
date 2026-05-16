import axios from 'axios';
import { z } from 'zod';
import apiClient, { API_BASE_URL } from '@/lib/api';
import { logger } from '@/utils/logger';
import type {
  PreferencesBody,
  SettingsApiError,
  ApiErrorCode,
  UserCurrentResponse,
} from '@/types/settings';

// ─── Zod validation schemas ────────────────────────────────────────────────────

const notificationPreferencesSchema = z.object({
  learningReminders: z.boolean(),
  specialOffers: z.boolean(),
  subscriptionExpires: z.boolean(),
});

const lessonPreferencesSchema = z.object({
  eklanTalks: z.boolean().optional(),
  chatTranslation: z.boolean().optional(),
  englishAccent: z.string().optional(),
  voiceTone: z.string().optional(),
  speakingSpeed: z.string().optional(),
});

const preferencesSchema = z.object({
  nationality: z.string().optional(),
  language: z.string().optional(),
  learningGoal: z.string().optional(),
  learningGoals: z.array(z.string()).optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
  notificationPreferences: notificationPreferencesSchema.optional(),
  lessonPreferences: lessonPreferencesSchema.optional(),
});

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('A valid email is required'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required').max(500, 'Message must be at most 500 characters'),
});

const feedbackSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  rating: z.number().int().min(1).max(5),
  message: z.string().optional(),
});

// ─── Error helper ──────────────────────────────────────────────────────────────

/**
 * Parse an axios error into a typed SettingsApiError.
 * Returns a plain SettingsApiError — screens inspect `.code` to decide UI behaviour.
 */
export function parseEnvelopeError(err: unknown): SettingsApiError {
  const raw = axios.isAxiosError(err) ? (err.response?.data as any) : null;
  const code: ApiErrorCode = raw?.code ?? 'ServerError';
  const message: string =
    raw?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred');
  const errors = raw?.errors;

  const apiErr = new Error(message) as SettingsApiError;
  apiErr.code = code;
  apiErr.errors = errors;
  return apiErr;
}

// ─── Tokenless axios instance (for public /contact endpoint) ──────────────────

const publicClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Service ───────────────────────────────────────────────────────────────────

export const settingsService = {
  /**
   * GET /api/v1/users/current
   * Returns the authenticated user together with their learner profile.
   */
  async getCurrentUser(): Promise<UserCurrentResponse> {
    try {
      const response = await apiClient.get('/api/v1/users/current');
      // Backend returns { user, profile? } directly (no code/data wrapper)
      return response.data as UserCurrentResponse;
    } catch (err) {
      logger.error('❌ getCurrentUser failed:', err);
      throw parseEnvelopeError(err);
    }
  },

  /**
   * PATCH /api/v1/users/preferences
   * Client-validates with Zod, then sends only the provided fields.
   */
  async updatePreferences(body: PreferencesBody): Promise<void> {
    const parsed = preferencesSchema.safeParse(body);
    if (!parsed.success) {
      const apiErr = new Error('Validation failed') as SettingsApiError;
      apiErr.code = 'ValidationError';
      apiErr.errors = parsed.error.issues.map((i) => ({
        path: i.path.map(String),
        message: i.message,
      }));
      throw apiErr;
    }

    try {
      await apiClient.patch('/api/v1/users/preferences', parsed.data);
    } catch (err) {
      logger.error('❌ updatePreferences failed:', err);
      throw parseEnvelopeError(err);
    }
  },

  /**
   * POST /api/v1/auth/password/change
   * Maps server error codes to typed SettingsApiError for inline display.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/api/v1/auth/password/change', {
        currentPassword,
        newPassword,
      });
    } catch (err) {
      logger.error('❌ changePassword failed:', err);
      throw parseEnvelopeError(err);
    }
  },

  /**
   * POST /api/v1/auth/email/resend-verification
   * AlreadyVerified is treated as a success (returns code instead of throwing).
   */
  async resendVerificationEmail(): Promise<{ code: ApiErrorCode; message: string }> {
    try {
      const response = await apiClient.post('/api/v1/auth/email/resend-verification');
      return {
        code: response.data?.code ?? 'Success',
        message: response.data?.message ?? 'Verification email sent',
      };
    } catch (err) {
      logger.error('❌ resendVerificationEmail failed:', err);
      throw parseEnvelopeError(err);
    }
  },

  /**
   * POST /contact  (no auth — public endpoint)
   * Uses a separate axios instance that does NOT attach a Bearer token.
   */
  async submitContact(body: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void> {
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      const apiErr = new Error('Validation failed') as SettingsApiError;
      apiErr.code = 'ValidationError';
      apiErr.errors = parsed.error.issues.map((i) => ({
        path: i.path.map(String),
        message: i.message,
      }));
      throw apiErr;
    }

    try {
      await publicClient.post('/api/v1/contact', parsed.data);
    } catch (err) {
      logger.error('❌ submitContact failed:', err);
      throw parseEnvelopeError(err);
    }
  },

  /**
   * POST /api/v1/feedback  (requires auth)
   * Star rating must be an integer between 1 and 5.
   */
  async submitFeedback(body: {
    name: string;
    rating: number;
    message?: string;
  }): Promise<void> {
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      const apiErr = new Error('Validation failed') as SettingsApiError;
      apiErr.code = 'ValidationError';
      apiErr.errors = parsed.error.issues.map((i) => ({
        path: i.path.map(String),
        message: i.message,
      }));
      throw apiErr;
    }

    try {
      await apiClient.post('/api/v1/feedback', {
        ...parsed.data,
        message: parsed.data.message ?? '',
      });
    } catch (err) {
      logger.error('❌ submitFeedback failed:', err);
      throw parseEnvelopeError(err);
    }
  },
};
