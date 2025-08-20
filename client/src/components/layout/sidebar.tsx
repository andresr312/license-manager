import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navigation = [
  { name: 'Dashboard', href: '/', icon: 'fas fa-home' },
  { name: 'Licencias', href: '/licenses', icon: 'fas fa-certificate' },
  { name: 'Nueva Licencia', href: '/create-license', icon: 'fas fa-plus-circle' },
  { name: 'División de Ingresos', href: '/revenue-split', icon: 'fas fa-users' },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="hidden md:flex md:flex-col md:w-64">
      <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white border-r border-slate-200">
        <div className="flex items-center px-4 mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-certificate text-white text-sm"></i>
            </div>
            <span className="text-xl font-bold text-slate-900">LicenseHub</span>
          </div>
        </div>
        
        <nav className="flex-1 px-2 pb-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-l-md",
                  isActive
                    ? "bg-blue-50 border-r-2 border-blue-600 text-blue-700"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <i className={cn("mr-3", item.icon, isActive ? "text-blue-500" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
