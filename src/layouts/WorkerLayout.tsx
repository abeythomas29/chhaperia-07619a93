import { Outlet, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardList, History, LogOut, Loader2, Warehouse, Send, Boxes, Scissors } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SyncStatusPill from "@/components/SyncStatusPill";

export default function WorkerLayout() {
  const { user, loading, signOut, profileName, isAdmin, isWorker, isSlittingManager } = useAuth();
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
  if (!isWorker && isAdmin) return <Navigate to="/admin" replace />;
  if (!isWorker) return <Navigate to="/login" replace />;

  const navItems = [
    { to: "/worker", label: "New Entry", icon: ClipboardList, end: true },
    { to: "/worker/history", label: "My History", icon: History, end: false },
    { to: "/worker/stock", label: "Stock", icon: Warehouse, end: false },
    { to: "/worker/inventory", label: "Inventory", icon: Boxes, end: false },
    { to: "/worker/issues", label: "My Issues", icon: Send, end: false },
  ];

  if (isSlittingManager) {
    navItems.push({ to: "/slitting", label: "Slitting", icon: Scissors, end: false });
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="min-h-14 border-b bg-primary text-primary-foreground flex items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <Link to="/worker" className="flex min-w-0 items-center gap-3">
          <img src={logo} alt="Chhaperia Cables" className="h-8 w-auto max-w-[96px] shrink-0 object-contain sm:max-w-[140px]" />
          <span className="hidden text-sm font-bold leading-tight sm:block">Chhaperia Cables</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <SyncStatusPill />
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
