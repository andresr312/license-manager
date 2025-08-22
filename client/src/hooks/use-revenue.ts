import { useQuery } from "@tanstack/react-query";
import type { RevenueAnalytics, SplitPerson } from "@shared/schema";

export function useRevenueAnalytics() {
  return useQuery<RevenueAnalytics>({
    queryKey: ['/api/analytics'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al obtener analytics');
      return res.json();
    }
  });
}

export function useSplitPeople() {
  return useQuery<SplitPerson[]>({
    queryKey: ['/api/split-people'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/split-people', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al obtener split people');
      return res.json();
    }
  });
}
