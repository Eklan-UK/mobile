import { useQuery } from "@tanstack/react-query";
import { dailyFocusService } from "@/services/daily-focus.service";

export function useDailyFocusToday() {
  return useQuery({
    queryKey: ["daily-focus-today"],
    queryFn: () => dailyFocusService.getToday(),
    staleTime: 30_000,
    retry: false,
  });
}
