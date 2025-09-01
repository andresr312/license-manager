import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertLicenseSchema } from "@shared/schema";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const licenseFormSchema = insertLicenseSchema.extend({
  expirationDate: z.string().min(1, "La fecha de expiración es requerida"),
  hardwareId: z.string().min(1, "El Hardware ID es obligatorio"),
  cost: z.preprocess((val) => val === "" ? undefined : Number(val), z.number().min(0, "El costo debe ser mayor o igual a 0")),
  direccion1: z.string().optional(),
  direccion2: z.string().optional(),
  direccion3: z.string().optional(),
  direccion4: z.string().optional(),
}).omit({ expirationEpochDay: true });

type LicenseFormData = z.infer<typeof licenseFormSchema>;

const licenseTypes = [
  { value: "Factura Fiscal y Garantia", label: "Despacho y Garantia" },
  { value: "Factura Fiscal", label: "Despacho" },
  { value: "Garantia", label: "Garantia" },
];

export default function LicenseForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<LicenseFormData>({
    resolver: zodResolver(licenseFormSchema),
    defaultValues: {
      businessName: "",
      rif: "",
      adminPassword: "",
      direccion1: "",
      direccion2: "",
      direccion3: "",
      direccion4: "",
      licenseType: "",
      hardwareId: "",
      expirationDate: "",
      cost: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LicenseFormData) => {
      const expirationDate = new Date(data.expirationDate);
      const expirationEpochDay = Math.floor(expirationDate.getTime() / (1000 * 60 * 60 * 24)) + 1;
      return apiRequest('POST', '/api/licenses', {
        ...data,
        expirationEpochDay,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      toast({ title: "Licencia creada exitosamente" });
      setLocation('/licenses');
    },
    onError: () => {
      toast({ title: "Error al crear la licencia", variant: "destructive" });
    }
  });

  const onSubmit = (data: LicenseFormData) => {
    const fixedData = {
      ...data,
      cost: typeof data.cost === "string" ? parseFloat(data.cost) : data.cost
    };
    createMutation.mutate(fixedData);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-900">Crear Nueva Licencia</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Negocio *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Panadería El Buen Pan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="rif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RIF *</FormLabel>
                    <FormControl>
                      <Input placeholder="J-12345678-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="licenseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Licencia *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {licenseTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expirationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Expiración *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="adminPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña de Administrador *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contraseña admin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hardwareId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hardware ID *</FormLabel>
                    <FormControl>
                      <Input placeholder="ID del hardware" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-medium text-slate-900">Direcciones (opcional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="direccion1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección 1</FormLabel>
                      <FormControl>
                        <Input placeholder="Dirección principal (opcional)" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="direccion2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Dirección secundaria (opcional)" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="direccion3"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección 3</FormLabel>
                      <FormControl>
                        <Input placeholder="Tercera dirección (opcional)" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="direccion4"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección 4</FormLabel>
                      <FormControl>
                        <Input placeholder="Cuarta dirección (opcional)" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo (USD)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={field.value === undefined || Number.isNaN(field.value) ? "" : String(field.value)}
                      onChange={e => {
                        field.onChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setLocation('/licenses')}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2" />
                    Creando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2" />
                    Crear Licencia
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
