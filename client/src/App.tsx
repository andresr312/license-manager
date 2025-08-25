import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "./pages/dashboard";
import Licenses from "./pages/licenses";
import CreateLicense from "./pages/create-license";
import RevenueSplit from "./pages/revenue-split";
import Sidebar from "./components/layout/sidebar";
import Header from "./components/layout/header";
import NotFound from "@/pages/not-found";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import LoginPage from "./pages/login";
import AuditLogPage from "./pages/audit-log";
import CreateUserPage from "./pages/create-user";
import PaymentsPage from "./pages/payments";
function Router() {
  const [location] = useLocation();
  const showSidebar = location !== "/login";
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Detectar si es móvil
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar para desktop */}
      {showSidebar && !isMobile && <Sidebar />}
      {/* Sidebar para móvil */}
      {showSidebar && isMobile && (
        <Sidebar mobile open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      )}
      <div className="flex flex-col flex-1 w-0 overflow-auto">
        {/* Header con botón de menú móvil */}
        {showSidebar && isMobile && (
          <Header
            title="Licencias"
            showMobileMenu
            onMobileMenuToggle={() => setMobileSidebarOpen(true)}
          />
        )}
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/licenses" component={Licenses} />
          <Route path="/create-license" component={CreateLicense} />
          <Route path="/revenue-split" component={RevenueSplit} />
          <Route path="/payments" component={PaymentsPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/audit-log" component={AuditLogPage} />
          <Route path="/create-user" component={CreateUserPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && location !== "/login") {
      setLocation("/login");
    }
  }, [location, setLocation]);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
