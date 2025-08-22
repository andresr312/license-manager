import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
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

const navigation = [
  { name: 'Dashboard', href: '/', icon: 'fas fa-home' },
  { name: 'Licencias', href: '/licenses', icon: 'fas fa-certificate' },
  { name: 'Nueva Licencia', href: '/create-license', icon: 'fas fa-plus-circle' },
  { name: 'División de Ingresos', href: '/revenue-split', icon: 'fas fa-users' },
  { name: 'Audit Log', href: '/audit-log', icon: 'fas fa-list' },
];


interface SidebarProps {
  mobile?: boolean;
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobile = false, open = false, onClose }: SidebarProps) {
  const [location] = useLocation();
  const role = getUserRole();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  const sidebarContent = (
    <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white border-r border-slate-200 h-full">
      <div className="flex items-center px-4 mb-8 justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-bold text-slate-900">Licencias</span>
        </div>
        <div className="relative">
          <button
            className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center focus:outline-none"
            onClick={() => setUserMenuOpen((open) => !open)}
            title="Usuario"
          >
            <i className="fas fa-user text-slate-600" />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-10">
              <button
                className="w-full text-left px-4 py-2 hover:bg-slate-100"
                onClick={handleLogout}
              >Cerrar sesión</button>
            </div>
          )}
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
        {role === 'admin' && (
          <Link
            href="/create-user"
            className={cn(
              "group flex items-center px-2 py-2 text-sm font-medium rounded-l-md text-slate-700 hover:bg-slate-50"
            )}
          >
            <i className={cn("mr-3 fas fa-user-plus text-slate-400")} />
            Crear usuario
          </Link>
        )}
      </nav>
    </div>
  );

  if (mobile) {
    return (
      <Drawer open={open} onOpenChange={onClose}>
        <DrawerContent side="left" className="p-0">
          {sidebarContent}
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <div className="hidden md:flex md:flex-col md:w-64">
      {sidebarContent}
    </div>
  );
}
