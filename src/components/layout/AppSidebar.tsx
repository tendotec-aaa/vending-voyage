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
import { useTranslation } from "react-i18next";

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isAccountant, isOperator, hasFinancialAccess, isLoading } = useUserRole();
  const { t } = useTranslation();

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (isLoading) return null;

  const showAdminDashboard = isAdmin || isAccountant;
  const showOperatorDashboard = true;
  const showAssets = isAdmin || isAccountant;
  const showLocations = isAdmin || isAccountant;
  const showSupplyChain = isAdmin || isAccountant;
  const showInsights = isAdmin || isAccountant;
  const showBusiness = isAdmin;
  const showAdminSection = isAdmin;

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg text-sidebar-foreground">{t('sidebar.appName')}</h1>
            <p className="text-xs text-muted-foreground">{t('sidebar.appSubtitle')}</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-3 py-4">
        {/* Dashboard Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {showAdminDashboard && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/")} className="w-full">
                    <NavLink to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                      <LayoutDashboard className="w-5 h-5" />
                      <span>{t('sidebar.dashboard')}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isOperator && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/dashboard")} className="w-full">
                    <NavLink to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                      <LayoutDashboard className="w-5 h-5" />
                      <span>{t('sidebar.myDashboard')}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operations */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            {t('sidebar.operations')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { titleKey: "sidebar.visitReports", icon: ClipboardList, url: "/visits" },
                { titleKey: "sidebar.routes", icon: Route, url: "/routes" },
                { titleKey: "sidebar.maintenance", icon: Wrench, url: "/maintenance" },
              ].map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                    <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                      <item.icon className="w-5 h-5" />
                      <span>{t(item.titleKey)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/warehouse")} className="w-full">
                  <NavLink to="/warehouse" className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                    <Warehouse className="w-5 h-5" />
                    <span>{t('sidebar.warehouse')}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Assets & Inventory */}
        {showAssets && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              {t('sidebar.assetsInventory')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { titleKey: "sidebar.inventoryValuation", icon: Boxes, url: "/inventory" },
                  { titleKey: "sidebar.machines", icon: Truck, url: "/machines" },
                  { titleKey: "sidebar.setups", icon: Layers, url: "/setups" },
                ].map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                      <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                        <item.icon className="w-5 h-5" />
                        <span>{t(item.titleKey)}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Locations */}
        {showLocations && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              {t('sidebar.locationsGroup')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { titleKey: "sidebar.locations", icon: MapPin, url: "/locations" },
                  { titleKey: "sidebar.spots", icon: Target, url: "/spots" },
                ].map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                      <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                        <item.icon className="w-5 h-5" />
                        <span>{t(item.titleKey)}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Supply Chain */}
        {showSupplyChain && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              {t('sidebar.supplyChain')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { titleKey: "sidebar.suppliers", icon: Building2, url: "/suppliers" },
                  { titleKey: "sidebar.purchases", icon: ShoppingCart, url: "/purchases" },
                  { titleKey: "sidebar.sales", icon: DollarSign, url: "/sales" },
                ].map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                      <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                        <item.icon className="w-5 h-5" />
                        <span>{t(item.titleKey)}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Insights */}
        {showInsights && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              {t('sidebar.insights')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { titleKey: "sidebar.analytics", icon: BarChart3, url: "/analytics" },
                  { titleKey: "sidebar.itemAnalytics", icon: Package, url: "/insights/items" },
                  { titleKey: "sidebar.spotHealth", icon: Target, url: "/insights/spots" },
                  { titleKey: "sidebar.profitability", icon: TrendingUp, url: "/insights/profitability" },
                ].map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                      <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                        <item.icon className="w-5 h-5" />
                        <span>{t(item.titleKey)}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Business */}
        {showBusiness && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              {t('sidebar.business')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { titleKey: "sidebar.users", icon: Users, url: "/users" },
                  { titleKey: "sidebar.company", icon: Building2, url: "/company" },
                ].map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                      <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                        <item.icon className="w-5 h-5" />
                        <span>{t(item.titleKey)}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin */}
        {showAdminSection && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              {t('sidebar.admin')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { titleKey: "sidebar.operators", icon: Users, url: "/admin/operators" },
                  { titleKey: "sidebar.security", icon: Shield, url: "/admin/security" },
                ].map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                      <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                        <item.icon className="w-5 h-5" />
                        <span>{t(item.titleKey)}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Personal */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            {t('sidebar.personal')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { titleKey: "sidebar.profile", icon: Users, url: "/profile" },
                { titleKey: "sidebar.settings", icon: Settings, url: "/settings" },
              ].map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} className="w-full">
                    <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors">
                      <item.icon className="w-5 h-5" />
                      <span>{t(item.titleKey)}</span>
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
            title={t('sidebar.signOut')}
          >
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}