import Header from "@/components/layout/header";
import LicenseForm from "@/components/license/license-form";

export default function CreateLicense() {
  return (
    <div className="flex-1">
      <Header title="Crear Nueva Licencia" />
      
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="p-6">
          <LicenseForm />
        </div>
      </main>
    </div>
  );
}
