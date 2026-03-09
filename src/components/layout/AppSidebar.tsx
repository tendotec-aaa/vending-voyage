import { 
  LayoutDashboard, 
  Truck, 
  ClipboardList, 
  Package, 
  MapPin, 
  Settings, 
  Users,
  BarChart3,
  Wrench,
  LogOut,
  Layers,
  Building2,
  ShoppingCart,
  Warehouse,
  Boxes,
  Target,
  DollarSign,
  Route,
  Shield,
  TrendingUp,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isAccountant, isOperator, hasFinancialAccess, isLoading } = useUserRole();

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (isLoading) return null;

  // Computed visibility flags
  const showAdminDashboard = isAdmin || isAccountant;
  const showOperatorDashboard = true; // everyone can access /dashboard
  const showAssets = isAdmin || isAccountant;
  const showLocations = isAdmin || isAccountant;
  const showSupplyChain = isAdmin || isAccountant;
  const showInsights = isAdmin || isAccountant;
  const showBusiness = isAdmin; // admin only
  const showAdminSection = isAdmin; // admin only

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg text-sidebar-foreground">Vending ERP</h1>
            <p className="text-xs text-muted-foreground">Operations Hub</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-3 py-4">
        {/* Dashboard Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Admin/Accountant main dashboard */}
              {showAdminDashboard && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/")} className="w-full">
                    <NavLink to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                      <LayoutDashboard className="w-5 h-5" />
                      <span>Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {/* Operator field dashboard */}
              {isOperator && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/dashboard")} className="w-full">
                    <NavLink to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                      <LayoutDashboard className="w-5 h-5" />
                      <span>My Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operations — all roles */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { title: "Visit Reports", icon: ClipboardList, url: "/visits" },
                { title: "Routes", icon: Route, url: "/routes" },
                { title: "Maintenance", icon: Wrench, url: "/maintenance" },
              ].map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                    <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {/* Warehouse: visible to all (operators get view+adjust, accountant view-only) */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/warehouse")} className="w-full">
                  <NavLink to="/warehouse" className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                    <Warehouse className="w-5 h-5" />
                    <span>Warehouse</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Assets & Inventory — Admin and Accountant only */}
        {showAssets && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Assets & Inventory
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { title: "Inventory & Valuation", icon: Boxes, url: "/inventory" },
                  { title: "Machines", icon: Truck, url: "/machines" },
                  { title: "Setups", icon: Layers, url: "/setups" },
                ].map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                      <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Locations — Admin and Accountant */}
        {showLocations && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Locations
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { title: "Locations", icon: MapPin, url: "/locations" },
                  { title: "Spots", icon: Target, url: "/spots" },
                ].map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                      <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Supply Chain — Admin and Accountant */}
        {showSupplyChain && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Supply Chain
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { title: "Suppliers", icon: Building2, url: "/suppliers" },
                  { title: "Purchases", icon: ShoppingCart, url: "/purchases" },
                  { title: "Sales", icon: DollarSign, url: "/sales" },
                ].map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                      <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Insights — Admin and Accountant */}
        {showInsights && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Insights
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { title: "Analytics", icon: BarChart3, url: "/analytics" },
                  { title: "Item Analytics", icon: Package, url: "/insights/items" },
                  { title: "Spot Health", icon: Target, url: "/insights/spots" },
                  { title: "Profitability", icon: TrendingUp, url: "/insights/profitability" },
                ].map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                      <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Business — Admin ONLY */}
        {showBusiness && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Business
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { title: "Users", icon: Users, url: "/users" },
                  { title: "Company", icon: Building2, url: "/company" },
                ].map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                      <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin — Admin ONLY */}
        {showAdminSection && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { title: "Operators", icon: Users, url: "/admin/operators" },
                  { title: "Security", icon: Shield, url: "/admin/security" },
                ].map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                      <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Personal — all roles */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Personal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { title: "Profile", icon: Users, url: "/profile" },
                { title: "Settings", icon: Settings, url: "/settings" },
              ].map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                    <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2">
          <NavLink 
            to="/profile" 
            className="flex items-center gap-3 flex-1 min-w-0 p-2 -m-2 rounded-lg hover:bg-sidebar-accent/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.user_metadata?.first_names || user?.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || ''}
              </p>
            </div>
          </NavLink>
          <button 
            onClick={handleSignOut}
            className="p-2 rounded-lg hover:bg-sidebar-accent/10 transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
