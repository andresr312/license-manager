import { useQuery } from "@tanstack/react-query";

export type DashboardAnalytics = {
  totalLicenses: number;
  activeLicenses: number;
  expiringLicenses: number;
  expiredLicenses: number;
  monthlyRevenue: number;
};

export function useDashboardAnalytics() {
  return useQuery<DashboardAnalytics>({
    queryKey: ["/api/dashboard-analytics"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/dashboard-analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al obtener dashboard analytics");
      return res.json();
    },
  });
}
