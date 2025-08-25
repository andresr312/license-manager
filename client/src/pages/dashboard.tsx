import { useState } from "react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import LicenseStats from "@/components/license/license-stats";
import LicenseTable from "@/components/license/license-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLicenses } from "@/hooks/use-licenses";
import { useDashboardAnalytics } from "@/hooks/use-dashboard-analytics";
import { useSplitPeople } from "@/hooks/use-revenue";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LicenseWithStatus } from "@shared/schema";

import AuditLogPage from "./audit-log";

export default function Dashboard() {
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<LicenseWithStatus | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState("");
  const [newRenewCost, setNewRenewCost] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: licenses = [], isLoading: licensesLoading } = useLicenses();
  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics();
  const { data: splitPeople = [] } = useSplitPeople();

  const renewMutation = useMutation({
    mutationFn: async ({ licenseId, newExpirationEpochDay, cost }: { licenseId: string, newExpirationEpochDay: number, cost: number }) => {
      return apiRequest('PUT', `/api/licenses/${licenseId}/renew`, { newExpirationEpochDay, cost });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard-analytics'] });
      toast({ title: "Licencia renovada exitosamente" });
      setRenewDialogOpen(false);
      setSelectedLicense(null);
      setNewExpirationDate("");
      setNewRenewCost("");
    },
    onError: () => {
      toast({ title: "Error al renovar la licencia", variant: "destructive" });
    }
  });

  const handleRenewLicense = (license: LicenseWithStatus) => {
    setSelectedLicense(license);
    setRenewDialogOpen(true);
  };

  const handleRenewSubmit = () => {
    if (!selectedLicense || !newExpirationDate || !newRenewCost) return;
    const expirationDate = new Date(newExpirationDate);
    const expirationEpochDay = Math.floor(expirationDate.getTime() / (1000 * 60 * 60 * 24)) + 1;
    renewMutation.mutate({
      licenseId: selectedLicense.id,
      newExpirationEpochDay: expirationEpochDay,
      cost: parseFloat(newRenewCost)
    });
  };

  const recentLicenses = licenses.slice(0, 10);
  // monthlyRevenue is the only revenue stat in dashboard analytics
  const gainRevenue = analytics ? analytics.monthlyRevenue * 0.60 : 0;

  if (licensesLoading || analyticsLoading) {
    return (
      <div className="flex-1">
        <Header title="Dashboard" />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-xl h-24" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <Header title="Dashboard" />
      
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="p-6 space-y-6">
          {analytics && <LicenseStats analytics={analytics} />}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-lg">Licencias Recientes</span>
                <Button variant="outline" onClick={() => setDrawerOpen(true)}>
                  <i className="fas fa-list mr-2" /> Ver Audit Log
                </Button>
              </div>
              <LicenseTable 
                licenses={recentLicenses}
                onRenew={handleRenewLicense}
                showCost
              />
            </div>
            
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-900">Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/create-license">
                    <Button className="w-full flex items-center justify-start px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                      <i className="fas fa-plus mr-3" />
                      Crear Nueva Licencia
                    </Button>
                  </Link>
                  <Link href="/licenses">
                    <Button variant="secondary" className="w-full flex items-center justify-start px-4 py-3 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
                      <i className="fas fa-certificate mr-3" />
                      Ver Todas las Licencias
                    </Button>
                  </Link>
                  <Link href="/revenue-split">
                    <Button variant="secondary" className="w-full flex items-center justify-start px-4 py-3 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
                      <i className="fas fa-chart-bar mr-3" />
                      Ver Análisis
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Revenue Split */}
              <Card className="shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-900">División de Ingresos</CardTitle>
                </CardHeader>
                <CardContent>
                  {splitPeople.length > 0 ? (
                    <div className="space-y-3">
                      {splitPeople.slice(0, 3).map((person, index) => {
                        const share = gainRevenue * (person.percentage / 100);
                        const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600'];
                        const colorClass = colors[index % colors.length];
                        const initials = person.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
                        
                        return (
                          <div key={person.id} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-8 h-8 ${colorClass} rounded-full flex items-center justify-center mr-3`}>
                                <span className="text-white text-xs font-medium">{initials}</span>
                              </div>
                              <span className="text-sm font-medium text-slate-900">{person.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-slate-900">{person.percentage}%</div>
                              <div className="text-xs text-slate-500">${share.toLocaleString()}</div>
                            </div>
                          </div>
                        );
                      })}
                      
                      <Link href="/revenue-split">
                        <Button variant="outline" className="w-full mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
                          Gestionar División
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-500">
                      <p className="text-sm">No hay personas configuradas</p>
                      <Link href="/revenue-split">
                        <Button variant="outline" className="mt-2 text-blue-600 border border-blue-600 hover:bg-blue-50">
                          Configurar División
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Notifications */}
              <Card className="shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-900">Notificaciones Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {licenses.filter(l => l.status === 'expiring').slice(0, 3).map(license => (
                      <div key={license.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-amber-500 rounded-full mt-2" />
                        <div className="flex-1">
                          <p className="text-sm text-slate-900 font-medium">Licencia próxima a vencer</p>
                          <p className="text-xs text-slate-500">{license.businessName} expira en {license.daysRemaining} días</p>
                        </div>
                      </div>
                    ))}
                    
                    {licenses.filter(l => l.status === 'expiring').length === 0 && (
                      <div className="text-center py-4 text-slate-500">
                        <p className="text-sm">No hay notificaciones recientes</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Renew License Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renovar Licencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedLicense && (
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">Licencia Actual</h4>
                <p className="text-sm text-slate-600">{selectedLicense.businessName}</p>
                <p className="text-sm text-slate-500">RIF: {selectedLicense.rif}</p>
                <p className="text-sm text-slate-500">
                  Expira: {new Date(selectedLicense.expirationEpochDay * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')}
                </p>
                <p className="text-sm text-slate-500">Costo actual: ${selectedLicense.cost}</p>
              </div>
            )}
            <div>
              <Label htmlFor="newExpirationDate">Nueva Fecha de Expiración *</Label>
              <Input
                id="newExpirationDate"
                type="date"
                value={newExpirationDate}
                onChange={(e) => setNewExpirationDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="newRenewCost">Nuevo Costo de Renovación *</Label>
              <Input
                id="newRenewCost"
                type="number"
                step="0.01"
                value={newRenewCost}
                onChange={e => setNewRenewCost(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleRenewSubmit}
                disabled={renewMutation.isPending || !newExpirationDate || !newRenewCost}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {renewMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2" />
                    Renovando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-redo mr-2" />
                    Renovar Licencia
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit Log Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Audit Log</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="outline" className="absolute right-4 top-4">Cerrar</Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="p-4 overflow-auto max-h-[70vh]">
            <AuditLogPage />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
