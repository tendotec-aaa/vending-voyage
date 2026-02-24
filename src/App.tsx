import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
import Spots from "./pages/Spots";
import SpotDetail from "./pages/SpotDetail";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
            
            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/machines" element={<ProtectedRoute><Machines /></ProtectedRoute>} />
            <Route path="/machines/:id" element={<ProtectedRoute><MachineDetail /></ProtectedRoute>} />
            <Route path="/setups" element={<ProtectedRoute><Setups /></ProtectedRoute>} />
            <Route path="/visits" element={<ProtectedRoute><Visits /></ProtectedRoute>} />
            <Route path="/visits/new" element={<ProtectedRoute><NewVisitReport /></ProtectedRoute>} />
            <Route path="/visits/:id" element={<ProtectedRoute><VisitDetail /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/inventory/:id" element={<ProtectedRoute><ItemDetail /></ProtectedRoute>} />
            <Route path="/locations" element={<ProtectedRoute><Locations /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
            <Route path="/suppliers/:id" element={<ProtectedRoute><SupplierDetail /></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
            <Route path="/purchases/new" element={<ProtectedRoute><NewPurchase /></ProtectedRoute>} />
            <Route path="/purchases/:id" element={<ProtectedRoute><PurchaseDetail /></ProtectedRoute>} />
            <Route path="/warehouse" element={<ProtectedRoute><Warehouse /></ProtectedRoute>} />
             <Route path="/spots" element={<ProtectedRoute><Spots /></ProtectedRoute>} />
            <Route path="/spots/:id" element={<ProtectedRoute><SpotDetail /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/users/:id" element={<ProtectedRoute><UserDetail /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/company" element={<ProtectedRoute><CompanyProfile /></ProtectedRoute>} />
            <Route path="/locations/:id" element={<ProtectedRoute><LocationDetail /></ProtectedRoute>} />
            <Route path="/company" element={<ProtectedRoute><CompanyProfile /></ProtectedRoute>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
