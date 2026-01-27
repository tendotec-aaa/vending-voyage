import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Machines from "./pages/Machines";
import Setups from "./pages/Setups";
import Visits from "./pages/Visits";
import NewVisitReport from "./pages/NewVisitReport";
import Inventory from "./pages/Inventory";
import Locations from "./pages/Locations";
import Analytics from "./pages/Analytics";
import Maintenance from "./pages/Maintenance";
import Suppliers from "./pages/Suppliers";
import Purchases from "./pages/Purchases";
import NewPurchase from "./pages/NewPurchase";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
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
            <Route path="/setups" element={<ProtectedRoute><Setups /></ProtectedRoute>} />
            <Route path="/visits" element={<ProtectedRoute><Visits /></ProtectedRoute>} />
            <Route path="/visits/new" element={<ProtectedRoute><NewVisitReport /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/locations" element={<ProtectedRoute><Locations /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
            <Route path="/purchases/new" element={<ProtectedRoute><NewPurchase /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
