import Header from "@/components/layout/header";
import SplitManagement from "@/components/revenue/split-management";
import { useRevenueAnalytics, useSplitPeople } from "@/hooks/use-revenue";

export default function RevenueSplit() {
  const { data: analytics, isLoading: analyticsLoading } = useRevenueAnalytics();
  const { data: people = [], isLoading: peopleLoading } = useSplitPeople();

  if (analyticsLoading || peopleLoading) {
    return (
      <div className="flex-1">
        <Header title="División de Ingresos" />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl h-96" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <Header title="División de Ingresos" />
      
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="p-6">
          <SplitManagement 
            people={people} 
            totalRevenue={analytics?.totalRevenue || 0}
          />
        </div>
      </main>
    </div>
  );
}
