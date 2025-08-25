import { Card, CardContent } from "@/components/ui/card";
import type { RevenueAnalytics } from "@shared/schema";
import type { DashboardAnalytics } from "@/hooks/use-dashboard-analytics";

type LicenseStatsProps = {
  analytics: RevenueAnalytics | DashboardAnalytics;
};

export default function LicenseStats({ analytics }: LicenseStatsProps) {
  const stats = [
    {
      title: "Total Licencias",
      value: (analytics?.totalLicenses ?? 0).toString(),
      icon: "fas fa-certificate",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      title: "Licencias Activas",
      value: (analytics?.activeLicenses ?? 0).toString(),
      icon: "fas fa-check-circle",
      bgColor: "bg-emerald-100",
      iconColor: "text-emerald-600"
    },
    {
      title: "Por Vencer (7d)",
      value: (analytics?.expiringLicenses ?? 0).toString(),
      icon: "fas fa-exclamation-triangle",
      bgColor: "bg-amber-100",
      iconColor: "text-amber-600"
    },
    {
      title: "Licencias Expiradas",
      value: (analytics?.expiredLicenses ?? 0).toString(),
      icon: "fas fa-times-circle",
      bgColor: "bg-red-100",
      iconColor: "text-red-600"
    },
    {
      title: "Ingresos del Mes",
      value: `$${analytics?.monthlyRevenue?.toLocaleString() ?? 0}`,
      icon: "fas fa-dollar-sign",
      bgColor: "bg-green-100",
      iconColor: "text-green-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="shadow-sm border border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <i className={`${stat.icon} ${stat.iconColor} text-xl`} />
                </div>
              </div>
              <div className="ml-4">
                <div className="text-lg font-semibold text-slate-900">{stat.title}</div>
                <div className="text-2xl font-bold text-slate-700">{stat.value}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}