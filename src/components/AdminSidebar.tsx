import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Users,
  Building2,
  LogOut,
  Warehouse,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const mainItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Production Logs", url: "/admin/logs", icon: ClipboardList },
  { title: "Stock Management", url: "/admin/stock", icon: Warehouse },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Clients", url: "/admin/clients", icon: Building2 },
];

const superAdminItems = [
  { title: "User Management", url: "/admin/users", icon: Users },
];

export function AdminSidebar() {
  const { signOut, isSuperAdmin, profileName } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link to="/admin" className="flex flex-col items-center justify-center gap-3 py-2">
          <div className="bg-white p-2 rounded-lg w-full flex justify-center shadow-sm">
            <img src={logo} alt="Chhaperia Cables" className="h-8 max-w-full object-contain" />
          </div>
          <div className="text-center w-full">
            <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">Admin Panel</p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-base h-10">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild size="lg" className="text-lg h-14">
                    <NavLink to={item.url} end={item.url === "/admin"} activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <item.icon className="!h-6 !w-6 mr-2" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-base h-10 mt-4">Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild size="lg" className="text-lg h-14">
                      <NavLink to={item.url} activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                        <item.icon className="!h-6 !w-6 mr-2" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-sidebar-foreground/80 truncate font-semibold">{profileName ?? "Admin"}</span>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-sidebar-foreground/60 hover:text-sidebar-foreground h-10 w-10">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
