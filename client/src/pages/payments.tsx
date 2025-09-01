import { useState } from "react";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


function getUserRole() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null;
  } catch {
    return null;
  }
};

const paymentMethods = ["efectivo", "transferencia", "zelle", "pago móvil", "otro"];

export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/payments", statusFilter],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payments${statusFilter ? `?status=${statusFilter}` : ""}`);
      return await res.json();
    },
  });
  const payments = Array.isArray(data) ? data : [];

  // Modal and payment logic
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState(paymentMethods[0]);

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, reference, notes, method }: { id: string, reference: string, notes: string, method: string }) => {
      await apiRequest("PUT", `/api/payments/${id}/pay`, { reference, notes, method });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      setReportDialogOpen(false);
      setSelectedPayment(null);
      setReference("");
      setNotes("");
      setMethod(paymentMethods[0]);
    },
  });


  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
    },
  });

  const role = getUserRole();

  return (
    <div className="flex-1">
      <Header title="Pagos" />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <div className="mb-4 flex gap-2 items-center">
          <span className="font-semibold">Filtrar:</span>
          <Button size="sm" variant={statusFilter === "" ? "default" : "outline"} onClick={() => setStatusFilter("")}>Todos</Button>
          <Button size="sm" variant={statusFilter === "por cobrar" ? "default" : "outline"} onClick={() => setStatusFilter("por cobrar")}>Por cobrar</Button>
          <Button size="sm" variant={statusFilter === "cobrado" ? "default" : "outline"} onClick={() => setStatusFilter("cobrado")}>Cobrados</Button>
        </div>
        {isLoading ? (
          <div className="animate-pulse">Cargando pagos...</div>
        ) : (
          <div className="bg-white rounded-xl shadow p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Empresa (RIF)</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th>Notas</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-b">
                    <td>{p.businessName ? `${p.businessName} (${p.rif})` : <span className="text-slate-400">-</span>}</td>
                    <td>${p.amount}</td>
                    <td>{p.method}</td>
                    <td>{p.reference || <span className="text-slate-400">-</span>}</td>
                    <td>{p.notes || <span className="text-slate-400">-</span>}</td>
                    <td>
                      <Badge variant={p.status === "cobrado" ? "default" : "destructive"}>{p.status}</Badge>
                    </td>
                    <td>
                      {role === "admin" && (
                        <div className="flex gap-2">
                          {p.status === "por cobrar" && (
                            <Button onClick={() => { setSelectedPayment(p); setReportDialogOpen(true); }}>
                              Marcar como pagado
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            onClick={() => deletePaymentMutation.mutate(p.id)}
                            disabled={deletePaymentMutation.isPending}
                          >
                            Eliminar
                          </Button>
                        </div>
                      )}
                      {p.status === "cobrado" && (
                        <span className="text-xs text-slate-500">Cobrado por: {p.paidBy || "-"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 && <div className="text-center text-slate-500 py-8">No hay pagos registrados.</div>}
          </div>
        )}
        {/* Modal para reportar pago */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reportar pago recibido</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Método de pago</label>
                <select className="w-full border rounded px-2 py-1" value={method} onChange={e => setMethod(e.target.value)}>
                  {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Referencia (opcional)</label>
                <input className="w-full border rounded px-2 py-1" value={reference} onChange={e => setReference(e.target.value)} placeholder="Referencia de pago" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
                <input className="w-full border rounded px-2 py-1" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionales" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setReportDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => selectedPayment && markPaidMutation.mutate({ id: selectedPayment.id, reference, notes, method })}
                  disabled={markPaidMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {markPaidMutation.isPending ? "Reportando..." : "Reportar como pagado"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}