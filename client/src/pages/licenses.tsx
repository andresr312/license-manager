import React, { useState } from "react";
import Header from "@/components/layout/header";
import LicenseTable from "@/components/license/license-table";
import { useLicenses } from "@/hooks/use-licenses";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LicenseWithStatus } from "@shared/schema";

export default function Licenses() {
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<LicenseWithStatus | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState("");
  const [newRenewCost, setNewRenewCost] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: licenses = [], isLoading } = useLicenses();

  const renewMutation = useMutation({
    mutationFn: async ({ licenseId, newExpirationEpochDay, cost }: { licenseId: string, newExpirationEpochDay: number, cost: number }) => {
      return apiRequest('PUT', `/api/licenses/${licenseId}/renew`, { newExpirationEpochDay, cost });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
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
    const creationDate = new Date(license.creationEpochDay * 24 * 60 * 60 * 1000);
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

  if (isLoading) {
    return (
      <div className="flex-1">
        <Header title="Licencias" />
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
      <Header title="Licencias" />
      
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="p-6">
          <LicenseTable 
            licenses={licenses}
            onRenew={handleRenewLicense}
          />
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
                disabled={renewMutation.isPending || !newExpirationDate}
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
    </div>
  );
}
