import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, ClipboardList, Package, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={() => navigate("/visits/new")}
          className="h-auto py-4 flex flex-col items-center gap-2 bg-primary hover:bg-primary/90"
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-sm">New Visit</span>
        </Button>
        <Button 
          onClick={() => navigate("/warehouse/assembly/new")}
          variant="secondary"
          className="h-auto py-4 flex flex-col items-center gap-2"
        >
          <Layers className="w-5 h-5" />
          <span className="text-sm">Assemble Item</span>
        </Button>
        <Button 
          onClick={() => navigate("/inventory")}
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
        >
          <Package className="w-5 h-5" />
          <span className="text-sm">Stock Check</span>
        </Button>
        <Button 
          onClick={() => navigate("/maintenance")}
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">Report Issue</span>
        </Button>
      </div>
    </Card>
  );
}
