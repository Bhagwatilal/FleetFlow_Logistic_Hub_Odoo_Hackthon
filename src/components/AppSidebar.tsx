import {
  LayoutDashboard,
  Truck,
  MapPin,
  Wrench,
  DollarSign,
  Users,
  BarChart3,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface NavItem {
  title: string;
  url: string;
  icon: any;
  roles: AppRole[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["fleet_manager", "dispatcher", "safety_officer", "financial_analyst"] },
  { title: "Vehicle Registry", url: "/vehicles", icon: Truck, roles: ["fleet_manager", "dispatcher"] },
  { title: "Trip Dispatcher", url: "/trips", icon: MapPin, roles: ["fleet_manager", "dispatcher"] },
  { title: "Maintenance", url: "/maintenance", icon: Wrench, roles: ["fleet_manager"] },
  { title: "Expenses", url: "/expenses", icon: DollarSign, roles: ["fleet_manager", "financial_analyst"] },
  { title: "Driver Performance", url: "/drivers", icon: Users, roles: ["fleet_manager", "safety_officer"] },
  { title: "Analytics", url: "/analytics", icon: BarChart3, roles: ["fleet_manager", "financial_analyst"] },
];

export function AppSidebar() {
  const { role, signOut, user } = useAuth();

  const visibleItems = navItems.filter(
    (item) => !role || item.roles.includes(role)
  );

  return (
    <Sidebar className="border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
        <Truck className="h-7 w-7 text-sidebar-primary" />
        <span className="text-lg font-bold text-sidebar-accent-foreground">FleetFlow</span>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="text-xs text-muted-foreground mb-2 truncate">
          {user?.email}
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
