import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function Header({ title, showMobileMenu, onMobileMenuToggle }: HeaderProps) {
  return (
    <div className="bg-white shadow-sm border-b border-slate-200">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {showMobileMenu && (
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden mr-3"
                onClick={onMobileMenuToggle}
              >
                <i className="fas fa-bars text-slate-500" />
              </Button>
            )}
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="relative p-2 text-slate-400 hover:text-slate-500 bg-slate-100 rounded-full">
              <i className="fas fa-bell" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">3</span>
            </Button>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">AD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
