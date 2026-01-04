import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function MaintenancePage() {
  return (
    <AppLayout
      title="Maintenance"
      subtitle="Service tickets and machine lifecycle management"
    >
      <Card className="p-12 bg-card border-border text-center">
        <Construction className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Smart maintenance workflows, machine lifecycle history, and automated 
          service scheduling are being developed.
        </p>
      </Card>
    </AppLayout>
  );
}
