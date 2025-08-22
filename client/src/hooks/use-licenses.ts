import { useQuery } from "@tanstack/react-query";
import type { LicenseWithStatus } from "@shared/schema";

export function useLicenses() {
  return useQuery<LicenseWithStatus[]>({
    queryKey: ['/api/licenses'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/licenses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al obtener licencias');
      return res.json();
    }
  });
}
