import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RequireRole } from "@/components/auth/RequireRole";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import Index from "./pages/Index";
import Machines from "./pages/Machines";
import MachineDetail from "./pages/MachineDetail";
import Setups from "./pages/Setups";
import Visits from "./pages/Visits";
import NewVisitReport from "./pages/NewVisitReport";
import VisitDetail from "./pages/VisitDetail";
import Inventory from "./pages/Inventory";
import Locations from "./pages/Locations";
import Analytics from "./pages/Analytics";
import Maintenance from "./pages/Maintenance";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail";
import Purchases from "./pages/Purchases";
import PurchaseDetail from "./pages/PurchaseDetail";
import NewPurchase from "./pages/NewPurchase";
import Warehouse from "./pages/Warehouse";
import NewAssembly from "./pages/NewAssembly";
import Sales from "./pages/Sales";
import NewSale from "./pages/NewSale";
import SaleDetail from "./pages/SaleDetail";
import Spots from "./pages/Spots";
import SpotDetail from "./pages/SpotDetail";
import RoutesPage from "./pages/Routes";
import RouteDetail from "./pages/RouteDetail";
import Users from "./pages/Users";
import UserDetail from "./pages/UserDetail";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import UserProfile from "./pages/UserProfile";
import CompanyProfile from "./pages/CompanyProfile";
import LocationDetail from "./pages/LocationDetail";
import ItemDetail from "./pages/ItemDetail";
import AdminSecurity from "./pages/AdminSecurity";
import Notifications from "./pages/Notifications";
import Profitability from "./pages/Profitability";
import ItemAnalytics from "./pages/ItemAnalytics";
import SpotHealth from "./pages/SpotHealth";
import OperatorDashboard from "./pages/OperatorDashboard";
import AdminOperators from "./pages/AdminOperators";
import OperatorInventory from "./pages/OperatorInventory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Role sets for convenience
const ADMIN_ACCOUNTANT = ['admin', 'accountant'] as const;
const ADMIN_ONLY = ['admin'] as const;
const ALL_ROLES = ['admin', 'accountant', 'route_operator', 'warehouse_manager'] as const;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

            {/* Admin/Accountant Dashboard (/) — operators redirected to /dashboard */}
            <Route path="/" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]} redirectTo="/dashboard">
                  <Index />
                </RequireRole>
              </ProtectedRoute>
            } />

            {/* Operator Dashboard — accessible to all */}
            <Route path="/dashboard" element={<ProtectedRoute><OperatorDashboard /></ProtectedRoute>} />

            {/* Operations — all roles */}
            <Route path="/visits" element={<ProtectedRoute><Visits /></ProtectedRoute>} />
            <Route path="/visits/new" element={<ProtectedRoute><NewVisitReport /></ProtectedRoute>} />
            <Route path="/visits/:id" element={<ProtectedRoute><VisitDetail /></ProtectedRoute>} />
            <Route path="/routes" element={<ProtectedRoute><RoutesPage /></ProtectedRoute>} />
            <Route path="/routes/:id" element={<ProtectedRoute><RouteDetail /></ProtectedRoute>} />
            <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />

            {/* Warehouse — Admin, Accountant, Operator */}
            <Route path="/warehouse" element={
              <ProtectedRoute>
                <RequireRole roles={[...ALL_ROLES]}>
                  <Warehouse />
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/warehouse/assembly/new" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <NewAssembly />
                </RequireRole>
              </ProtectedRoute>
            } />

            {/* Operator Inventory → redirect to /warehouse */}
            <Route path="/operator/inventory" element={<Navigate to="/warehouse" replace />} />

            {/* Inventory & Valuation — Admin and Accountant ONLY */}
            <Route path="/inventory" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <Inventory />
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/inventory/:id" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <ItemDetail />
                </RequireRole>
              </ProtectedRoute>
            } />

            {/* Assets — Admin and Accountant */}
            <Route path="/machines" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <Machines />
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/machines/:id" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <MachineDetail />
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/setups" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <Setups />
                </RequireRole>
              </ProtectedRoute>
            } />

            {/* Locations — Admin and Accountant */}
            <Route path="/locations" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <Locations />
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/locations/:id" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <LocationDetail />
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/spots" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <Spots />
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/spots/:id" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <SpotDetail />
                </RequireRole>
              </ProtectedRoute>
            } />

            {/* Supply Chain — Admin and Accountant */}
            <Route path="/suppliers" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <Suppliers />
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/suppliers/:id" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <SupplierDetail />
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/purchases" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <PermissionGuard requiredPerm="manage_purchases">
                    <Purchases />
                  </PermissionGuard>
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/purchases/new" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <PermissionGuard requiredPerm="manage_purchases">
                    <NewPurchase />
                  </PermissionGuard>
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/purchases/:id" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <PermissionGuard requiredPerm="manage_purchases">
                    <PurchaseDetail />
                  </PermissionGuard>
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/sales" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <PermissionGuard requiredPerm="manage_sales">
                    <Sales />
                  </PermissionGuard>
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/sales/new" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <PermissionGuard requiredPerm="manage_sales">
                    <NewSale />
                  </PermissionGuard>
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/sales/:id" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <PermissionGuard requiredPerm="manage_sales">
                    <SaleDetail />
                  </PermissionGuard>
                </RequireRole>
              </ProtectedRoute>
            } />

            {/* Insights — Admin and Accountant */}
            <Route path="/analytics" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <PermissionGuard requiredPerm="view_analytics">
                    <Analytics />
                  </PermissionGuard>
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/insights/profitability" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <PermissionGuard requiredPerm="view_profits">
                    <Profitability />
                  </PermissionGuard>
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/insights/items" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <PermissionGuard requiredPerm="view_analytics">
                    <ItemAnalytics />
                  </PermissionGuard>
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/insights/spots" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ACCOUNTANT]}>
                  <PermissionGuard requiredPerm="view_analytics">
                    <SpotHealth />
                  </PermissionGuard>
                </RequireRole>
              </ProtectedRoute>
            } />

            {/* Business — Admin ONLY */}
            <Route path="/users" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ONLY]}>
                  <PermissionGuard requiredPerm="manage_users">
                    <Users />
                  </PermissionGuard>
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/users/:id" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ONLY]}>
                  <PermissionGuard requiredPerm="manage_users">
                    <UserDetail />
                  </PermissionGuard>
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/company" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ONLY]}>
                  <PermissionGuard requiredPerm="manage_users">
                    <CompanyProfile />
                  </PermissionGuard>
                </RequireRole>
              </ProtectedRoute>
            } />

            {/* Admin-only routes */}
            <Route path="/admin/operators" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ONLY]}>
                  <AdminOperators />
                </RequireRole>
              </ProtectedRoute>
            } />
            <Route path="/admin/security" element={
              <ProtectedRoute>
                <RequireRole roles={[...ADMIN_ONLY]}>
                  <AdminSecurity />
                </RequireRole>
              </ProtectedRoute>
            } />

            {/* Personal — all */}
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
