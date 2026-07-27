import type { NotificationData } from '@/types/notifications';
import {
  decodeWeekStartDate,
  encodeWeekStartDate,
} from '@/utils/challengeDrillAdapter';
import { openAssignedDrill } from '@/utils/drillNavigation';
import { logger } from '@/utils/logger';
import { router } from 'expo-router';
import { Linking } from 'react-native';

function coerceString(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  return String(value);
}

function parseDrillCompletedUrl(url: string): {
  drillId: string;
  assignmentId?: string;
} | null {
  const match = url.match(/^\/account\/drills\/([^/]+)\/completed/);
  if (!match) return null;

  const drillId = match[1];
  const queryIndex = url.indexOf('?');
  let assignmentId: string | undefined;

  if (queryIndex !== -1) {
    const params = new URLSearchParams(url.slice(queryIndex + 1));
    assignmentId = params.get('assignmentId') ?? undefined;
  }

  return { drillId, assignmentId };
}

async function navigateDrillDetail(data: NotificationData): Promise<void> {
  const drillId = coerceString(data.resourceId) ?? coerceString(data.drillId);
  const assignmentId = coerceString(data.assignmentId);

  if (!drillId) {
    router.push('/notifications' as never);
    return;
  }

  try {
    await openAssignedDrill(drillId, assignmentId);
  } catch (error) {
    logger.warn('[navigateFromNotification] Failed to open drill:', error);
    router.push('/notifications' as never);
  }
}

function navigateDrillCompleted(data: NotificationData): void {
  const drillId = coerceString(data.resourceId) ?? coerceString(data.drillId);
  const assignmentId = coerceString(data.assignmentId);

  if (!drillId) {
    router.push('/notifications' as never);
    return;
  }

  const query = assignmentId
    ? `?drillId=${drillId}&assignmentId=${assignmentId}`
    : `?drillId=${drillId}`;

  router.push(`/practice/drills/results${query}` as never);
}

function navigateWeeklyChallenge(data: NotificationData): void {
  const rawWeekStartDate = coerceString(data.weekStartDate);
  if (!rawWeekStartDate) {
    router.push('/notifications' as never);
    return;
  }

  const weekStartDate = decodeWeekStartDate(rawWeekStartDate);
  router.push(
    `/practice/weekly-challenge/${encodeWeekStartDate(weekStartDate)}` as never
  );
}

function openNpsForm(data: NotificationData): void {
  const url = coerceString(data.url);
  if (!url) {
    router.push('/notifications' as never);
    return;
  }

  Linking.openURL(url).catch((error) => {
    logger.warn('[navigateFromNotification] Failed to open NPS URL:', error);
    router.push('/notifications' as never);
  });
}

function routeByScreen(data: NotificationData): boolean {
  const screen = coerceString(data.screen);
  if (!screen) return false;

  switch (screen) {
    case 'DrillDetail':
      void navigateDrillDetail(data);
      return true;
    case 'DrillCompleted':
      navigateDrillCompleted(data);
      return true;
    case 'DailyFocus': {
      const id = coerceString(data.resourceId);
      if (!id) {
        router.push('/notifications' as never);
        return true;
      }
      router.push(`/daily-focus/${id}` as never);
      return true;
    }
    case 'MyPlan':
      router.push('/(tabs)/plan' as never);
      return true;
    case 'Home':
      router.push('/(tabs)' as never);
      return true;
    case 'Classes':
      router.push('/sessions' as never);
      return true;
    case 'WeeklyChallenge':
      navigateWeeklyChallenge(data);
      return true;
    case 'Achievements':
      router.push('/badges' as never);
      return true;
    case 'NpsForm':
      openNpsForm(data);
      return true;
    case 'Notifications':
      router.push('/notifications' as never);
      return true;
    case 'TutorStudentDetail':
      return true;
    default:
      return false;
  }
}

function navigateFromUrl(data: NotificationData): void {
  const url = coerceString(data.url) ?? '';

  if (!url) {
    router.push('/notifications' as never);
    return;
  }

  if (url.startsWith('/account/drills/') && url.includes('/completed')) {
    const parsed = parseDrillCompletedUrl(url);
    if (parsed) {
      navigateDrillCompleted({
        resourceId: parsed.drillId,
        assignmentId: parsed.assignmentId,
      });
      return;
    }
  }

  if (/^\/account\/drills\/[^/]+$/.test(url)) {
    const drillId = url.split('/').pop();
    if (drillId) {
      void navigateDrillDetail({ resourceId: drillId });
      return;
    }
  }

  if (url.startsWith('/account/daily-focus/')) {
    const id = url.split('/').pop();
    if (id) {
      router.push(`/daily-focus/${id}` as never);
      return;
    }
  }

  if (url.startsWith('/account/practice/weekly-challenge/')) {
    const encoded = url.split('/').pop();
    if (encoded) {
      navigateWeeklyChallenge({ weekStartDate: decodeURIComponent(encoded) });
      return;
    }
  }

  if (url === '/account/drills') {
    router.push('/(tabs)/plan' as never);
    return;
  }

  if (url === '/account') {
    router.push('/(tabs)' as never);
    return;
  }

  if (url.startsWith('/account/classes')) {
    router.push('/sessions' as never);
    return;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    Linking.openURL(url).catch((error) => {
      logger.warn('[navigateFromNotification] Failed to open URL:', error);
      router.push('/notifications' as never);
    });
    return;
  }

  router.push('/notifications' as never);
}

/**
 * Navigate from notification payload (in-app tap or push deep link).
 * Prefers `data.screen`; falls back to parsing `data.url`.
 */
export function navigateFromNotification(data?: NotificationData): void {
  if (!data) {
    router.push('/notifications' as never);
    return;
  }

  if (routeByScreen(data)) {
    return;
  }

  navigateFromUrl(data);
}
