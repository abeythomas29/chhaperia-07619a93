import { Outlet, Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Factory, ClipboardList, History, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function WorkerLayout() {
  const { user, loading, signOut, profileName } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const navItems = [
    { to: "/worker", label: "New Entry", icon: ClipboardList, end: true },
    { to: "/worker/history", label: "My History", icon: History, end: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b bg-primary text-primary-foreground flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Factory className="h-5 w-5" />
          <span className="font-bold text-sm">Chhaperia Cables</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-80 hidden sm:inline">{profileName ?? "Worker"}</span>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary/80">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <nav className="border-b bg-card flex gap-1 px-4">
        {navItems.map((item) => {
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
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
      </nav>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Outlet />
      </div>
    </div>
  );
}
