import apiClient from '@/lib/api';
import type { BadgeStateResponse } from '@/types/badge.types';

export const userBadgesQueryKey = ['user-badges'] as const;

export async function fetchBadges(): Promise<BadgeStateResponse> {
  const response = await apiClient.get('/api/v1/badges');
  return response.data?.data ?? response.data;
}
