import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Machines from "./pages/Machines";
import Setups from "./pages/Setups";
import Visits from "./pages/Visits";
import NewVisitReport from "./pages/NewVisitReport";
import Inventory from "./pages/Inventory";
import Locations from "./pages/Locations";
import Analytics from "./pages/Analytics";
import Maintenance from "./pages/Maintenance";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/machines" element={<Machines />} />
          <Route path="/setups" element={<Setups />} />
          <Route path="/visits" element={<Visits />} />
          <Route path="/visits/new" element={<NewVisitReport />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
