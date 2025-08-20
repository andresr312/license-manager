import { Card, CardContent } from "@/components/ui/card";
import type { RevenueAnalytics } from "@shared/schema";

interface LicenseStatsProps {
  analytics: RevenueAnalytics;
}

export default function LicenseStats({ analytics }: LicenseStatsProps) {
  const stats = [
    {
      title: "Total Licencias",
      value: analytics.totalLicenses.toString(),
      icon: "fas fa-certificate",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      title: "Licencias Activas",
      value: analytics.activeLicenses.toString(),
      icon: "fas fa-check-circle",
      bgColor: "bg-emerald-100",
      iconColor: "text-emerald-600"
    },
    {
      title: "Por Vencer (30d)",
      value: analytics.expiringLicenses.toString(),
      icon: "fas fa-exclamation-triangle",
      bgColor: "bg-amber-100",
      iconColor: "text-amber-600"
    },
    {
      title: "Ingresos del Mes",
      value: `$${analytics.monthlyRevenue.toLocaleString()}`,
      icon: "fas fa-dollar-sign",
      bgColor: "bg-green-100",
      iconColor: "text-green-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
