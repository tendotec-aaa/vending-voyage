import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppLayout
      title="Settings"
      subtitle="Configure system preferences and integrations"
    >
      <Card className="p-12 bg-card border-border text-center">
        <Construction className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Company settings, notification preferences, API integrations, 
          and dynamic pricing configuration are being developed.
        </p>
      </Card>
    </AppLayout>
  );
}
