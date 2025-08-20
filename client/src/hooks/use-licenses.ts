import { useQuery } from "@tanstack/react-query";
import type { LicenseWithStatus } from "@shared/schema";

export function useLicenses() {
  return useQuery<LicenseWithStatus[]>({
    queryKey: ['/api/licenses'],
  });
}
