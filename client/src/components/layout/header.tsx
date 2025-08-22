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
                aria-label="Abrir menú"
              >
                <i className="fas fa-bars text-slate-500" />
              </Button>
            )}
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          </div>
        </div>
      </div>
    </div>
  );
}
