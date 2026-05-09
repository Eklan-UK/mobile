import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService, parseEnvelopeError } from '@/services/settings.service';
import type {
  PreferencesBody,
  SettingsApiError,
  UserCurrentResponse,
} from '@/types/settings';

// ─── Query key ─────────────────────────────────────────────────────────────────

export const USER_CURRENT_KEY = ['user-current'] as const;

// ─── Read: current user + profile ─────────────────────────────────────────────

/**
 * Fetch the authenticated user together with their learner profile.
 * All Settings screens share this single cache entry.
 */
export function useUserCurrent() {
  return useQuery<UserCurrentResponse, SettingsApiError>({
    queryKey: USER_CURRENT_KEY,
    queryFn: () => settingsService.getCurrentUser(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ─── Mutation: PATCH /users/preferences with optimistic update ─────────────────

/**
 * Update any combination of preference fields.
 * Applies an optimistic update so toggles feel instant,
 * rolls back on error, and invalidates the cache on settle.
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation<void, SettingsApiError, PreferencesBody>({
    mutationFn: (body) => settingsService.updatePreferences(body),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: USER_CURRENT_KEY });
      const snapshot = queryClient.getQueryData<UserCurrentResponse>(USER_CURRENT_KEY);

      queryClient.setQueryData<UserCurrentResponse>(USER_CURRENT_KEY, (old) => {
        if (!old) return old;

        const updatedProfile = {
          ...old.profile,
          ...(newData.nationality !== undefined && { nationality: newData.nationality }),
          ...(newData.language !== undefined && { language: newData.language }),
          ...(newData.learningGoal !== undefined && { learningGoal: newData.learningGoal }),
          ...(newData.learningGoals !== undefined && { learningGoals: newData.learningGoals }),
          ...(newData.notificationPreferences !== undefined && {
            notificationPreferences: newData.notificationPreferences,
          }),
          ...(newData.lessonPreferences !== undefined && {
            lessonPreferences: {
              ...old.profile?.lessonPreferences,
              ...newData.lessonPreferences,
            },
          }),
        };

        return { ...old, profile: updatedProfile as typeof old.profile };
      });

      return { snapshot };
    },
    onError: (_err, _vars, ctx: any) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(USER_CURRENT_KEY, ctx.snapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USER_CURRENT_KEY });
    },
  });
}

// ─── Mutation: change password ─────────────────────────────────────────────────

export function useChangePassword() {
  return useMutation<
    void,
    SettingsApiError,
    { currentPassword: string; newPassword: string }
  >({
    mutationFn: ({ currentPassword, newPassword }) =>
      settingsService.changePassword(currentPassword, newPassword),
  });
}

// ─── Mutation: resend email verification ──────────────────────────────────────

export function useResendVerification() {
  return useMutation<
    { code: string; message: string },
    SettingsApiError
  >({
    mutationFn: () => settingsService.resendVerificationEmail(),
  });
}

// ─── Mutation: contact form (no auth) ─────────────────────────────────────────

export function useSubmitContact() {
  return useMutation<
    void,
    SettingsApiError,
    { name: string; email: string; subject: string; message: string }
  >({
    mutationFn: (body) => settingsService.submitContact(body),
  });
}

// ─── Mutation: feedback ────────────────────────────────────────────────────────

export function useSubmitFeedback() {
  return useMutation<
    void,
    SettingsApiError,
    { name: string; rating: number; message?: string }
  >({
    mutationFn: (body) => settingsService.submitFeedback(body),
  });
}
