import { useQuery } from "@tanstack/react-query";
export type RevenueAnalytics = {
  // Original fields
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  totalLicenses: number;
  activeLicenses: number;
  expiringLicenses: number;
  expiredLicenses: number;
  // Nuevos campos
  cobrados: number;
  porCobrar: number;
  porcentajeCobrado: number;
  porcentajePorCobrar: number;
  weeks: string[];
  selectedWeek: string | null;
};
import type { SplitPerson } from "@shared/schema";

export function useRevenueAnalytics(week?: string) {
  return useQuery<RevenueAnalytics>({
    queryKey: ['/api/analytics', week],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const url = week ? `/api/analytics?week=${week}` : '/api/analytics';
      const res = await fetch(url, {
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
