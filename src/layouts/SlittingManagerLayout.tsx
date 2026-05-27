import { Outlet, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardList, History, LogOut, Loader2, PackageCheck, RotateCcw, Scissors } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SlittingManagerLayout() {
  const { user, loading, signOut, profileName, isAdmin, isSlittingManager, isWorker } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isSlittingManager && isAdmin) return <Navigate to="/admin" replace />;
  if (!isSlittingManager) return <Navigate to="/login" replace />;

  const navItems = [
    { to: "/slitting", label: "Slitting Entry", icon: Scissors, end: true },
    { to: "/slitting/return", label: "Material Return", icon: RotateCcw, end: false },
    { to: "/slitting/head36", label: "36 Head", icon: PackageCheck, end: false },
    { to: "/slitting/history", label: "My History", icon: History, end: false },
  ];

  if (isWorker) {
    navItems.push({ to: "/worker", label: "Production", icon: ClipboardList, end: false });
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="min-h-14 border-b bg-primary text-primary-foreground flex items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <Link to="/slitting" className="flex min-w-0 items-center gap-3">
          <img src={logo} alt="Chhaperia Cables" className="h-8 w-auto max-w-[96px] shrink-0 object-contain sm:max-w-[140px]" />
          <span className="hidden text-sm font-bold leading-tight sm:block">Chhaperia Cables</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 rounded-full bg-primary-foreground/10 px-2 py-1 sm:px-3">
            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-xs font-bold">
              {(profileName ?? "U").charAt(0).toUpperCase()}
            </div>
            <span className="max-w-[92px] truncate text-sm font-medium sm:max-w-[180px]">{profileName ?? user?.email ?? "User"}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="shrink-0 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary/80">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <nav className="border-b bg-card overflow-x-auto">
        <div className="flex min-w-max gap-1 px-3 sm:px-4">
          {navItems.map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4",
                  isActive
                    ? "border-secondary text-secondary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="mx-auto w-full max-w-4xl p-3 sm:p-4 md:p-6">
        <Outlet />
      </div>
    </div>
  );
}
