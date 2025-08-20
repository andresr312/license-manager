import { useQuery } from "@tanstack/react-query";
import type { RevenueAnalytics, SplitPerson } from "@shared/schema";

export function useRevenueAnalytics() {
  return useQuery<RevenueAnalytics>({
    queryKey: ['/api/analytics'],
  });
}

export function useSplitPeople() {
  return useQuery<SplitPerson[]>({
    queryKey: ['/api/split-people'],
  });
}
