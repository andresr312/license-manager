
import Header from "@/components/layout/header";
import SplitManagement from "@/components/revenue/split-management";
import { useRevenueAnalytics, useSplitPeople } from "@/hooks/use-revenue";
import { useState } from "react";

export default function RevenueSplit() {
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const { data: analytics, isLoading: analyticsLoading } = useRevenueAnalytics(selectedWeek === "" ? undefined : selectedWeek);
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
        <div className="p-6 space-y-6">
          <div className="mb-4 flex gap-2 items-center">
            <span className="font-semibold">Semana:</span>
            <select
              className="border rounded px-2 py-1"
              value={selectedWeek}
              onChange={e => {
                setSelectedWeek(e.target.value);
              }}
            >
              <option value="">Todas</option>
              {analytics?.weeks?.map((w: string) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
          {/* Porcentajes cobrados y por cobrar */}
          <div className="flex gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex-1">
              <div className="text-sm text-green-800">Cobrados</div>
              <div className="text-2xl font-bold text-green-700">{analytics?.porcentajeCobrado || 0}%</div>
              <div className="text-xs text-green-700">${analytics?.cobrados?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex-1">
              <div className="text-sm text-amber-800">Por cobrar</div>
              <div className="text-2xl font-bold text-amber-700">{analytics?.porcentajePorCobrar || 0}%</div>
              <div className="text-xs text-amber-700">${analytics?.porCobrar?.toLocaleString() || 0}</div>
            </div>
          </div>
          <SplitManagement 
            people={people} 
            totalRevenue={analytics?.totalRevenue || 0}
          />
        </div>
      </main>
    </div>
  );
}
