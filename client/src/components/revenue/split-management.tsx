import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertSplitPersonSchema, type SplitPerson } from "@shared/schema";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SplitPersonFormData = z.infer<typeof insertSplitPersonSchema>;

interface SplitManagementProps {
  people: SplitPerson[];
  totalRevenue: number;
}

function getUserRole() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null;
  } catch {
    return null;
  }
}

export default function SplitManagement({ people, totalRevenue }: SplitManagementProps) {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<SplitPersonFormData>({
    resolver: zodResolver(insertSplitPersonSchema),
    defaultValues: {
      name: "",
      percentage: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SplitPersonFormData) => {
      return apiRequest('POST', '/api/split-people', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/split-people'] });
      toast({ title: "Persona agregada exitosamente" });
      setShowForm(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error al agregar persona", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (personId: string) => {
      return apiRequest('DELETE', `/api/split-people/${personId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/split-people'] });
      toast({ title: "Persona eliminada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar persona", variant: "destructive" });
    }
  });

  const onSubmit = (data: SplitPersonFormData) => {
    const totalPercentage = people.reduce((sum, person) => sum + person.percentage, 0);
    if (totalPercentage + data.percentage > 100) {
      toast({ title: "No se puede exceder el 100% repartido", variant: "destructive" });
      return;
    }
    createMutation.mutate(data);
  };

  const totalPercentage = people.reduce((sum, person) => sum + person.percentage, 0);
  const gainRevenue = totalRevenue * 0.60; // 60% gain as in original code

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const colors = [
    'bg-blue-600',
    'bg-emerald-600', 
    'bg-purple-600',
    'bg-amber-600',
    'bg-pink-600',
    'bg-indigo-600'
  ];

  const role = getUserRole();

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">División de Ingresos</CardTitle>
            {role === "admin" && (
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <i className="fas fa-plus mr-2" />
                Agregar Persona
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {showForm && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input placeholder="Juan Pérez" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="percentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Porcentaje (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="100" 
                                placeholder="35"
                                {...field} 
                                value={field.value || ""} 
                                onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? "Guardando..." : "Agregar"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-slate-600">Ingresos Totales</p>
                  <p className="text-xl font-bold text-slate-900">${totalRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Ganancia (60%)</p>
                  <p className="text-xl font-bold text-green-600">${gainRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Asignado</p>
                  <p className={`text-xl font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalPercentage}%
                  </p>
                </div>
              </div>
            </div>

            {people.length > 0 ? (
              <div className="space-y-3">
                {people.map((person, index) => {
                  const share = gainRevenue * (person.percentage / 100);
                  const colorClass = colors[index % colors.length];
                  
                  return (
                    <div key={person.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 ${colorClass} rounded-full flex items-center justify-center mr-3`}>
                          <span className="text-white text-sm font-medium">{getInitials(person.name)}</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-900">{person.name}</span>
                          <div className="text-xs text-slate-500">{person.percentage}% del total</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-900">{person.percentage}%</div>
                          <div className="text-xs text-slate-500">${share.toLocaleString()}</div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(person.id)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-900"
                        >
                          <i className="fas fa-trash" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No hay personas configuradas para la división de ingresos
              </div>
            )}

            {totalPercentage !== 100 && people.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center">
                  <i className="fas fa-exclamation-triangle text-amber-600 mr-2" />
                  <span className="text-sm text-amber-800">
                    El total de porcentajes debe sumar 100%. Actual: {totalPercentage}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
