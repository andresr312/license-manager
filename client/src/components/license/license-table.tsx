import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { LicenseWithStatus } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface LicenseTableProps {
  licenses: LicenseWithStatus[];
  onRenew: (license: LicenseWithStatus) => void;
}

export default function LicenseTable({ licenses, onRenew }: LicenseTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (licenseId: string) => {
      return apiRequest('DELETE', `/api/licenses/${licenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      toast({ title: "Licencia eliminada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar la licencia", variant: "destructive" });
    }
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Licencia copiada al portapapeles" });
    } catch (error) {
      toast({ title: "Error al copiar licencia", variant: "destructive" });
    }
  };

  const filteredLicenses = licenses.filter(license => 
    license.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    license.rif.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-800">Activa</Badge>;
      case 'expiring':
        return <Badge className="bg-amber-100 text-amber-800">Por Vencer</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800">Expirada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'Estándar': 'bg-blue-100 text-blue-800',
      'Premium': 'bg-purple-100 text-purple-800',
      'Enterprise': 'bg-green-100 text-green-800'
    };
    
    return <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>{type}</Badge>;
  };

  return (
    <Card className="shadow-sm border border-slate-200">
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900">Licencias Recientes</CardTitle>
          <div className="flex space-x-2">
            <Input
              placeholder="Buscar licencias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Negocio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">RIF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expira</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredLicenses.map((license) => {
                const expirationDate = new Date(license.expirationEpochDay * 24 * 60 * 60 * 1000);
                return (
                  <tr key={license.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{license.businessName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{license.rif}</td>
                    <td className="px-6 py-4">{getTypeBadge(license.licenseType)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {expirationDate.toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(license.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(license.encodedLicense)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <i className="fas fa-copy" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRenew(license)}
                          className="text-emerald-600 hover:text-emerald-900"
                        >
                          <i className="fas fa-redo" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(license.id)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-900"
                        >
                          <i className="fas fa-trash" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredLicenses.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No se encontraron licencias
          </div>
        )}
      </CardContent>
    </Card>
  );
}
