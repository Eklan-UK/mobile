import { getMyMissionEnrollments } from '@/services/learning-journey.service';
import { useQuery, type QueryClient } from '@tanstack/react-query';

export const learningJourneyKeys = {
  all: ['learning-journey'] as const,
  myEnrollments: () => [...learningJourneyKeys.all, 'enrollments', 'me'] as const,
};

export function useMyMissionEnrollments() {
  return useQuery({
    queryKey: learningJourneyKeys.myEnrollments(),
    queryFn: getMyMissionEnrollments,
    staleTime: 1000 * 60 * 2, // 2 minutes — match drills hook
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}

export async function invalidateMissionEnrollmentCaches(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: learningJourneyKeys.myEnrollments() });
}
