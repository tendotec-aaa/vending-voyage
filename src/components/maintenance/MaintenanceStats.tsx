import { Card } from "@/components/ui/card";
import { Clock, Loader2, CheckCircle2 } from "lucide-react";

interface MaintenanceStatsProps {
  pending: number;
  inProgress: number;
  completed: number;
}

export function MaintenanceStats({ pending, inProgress, completed }: MaintenanceStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Clock className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-foreground">{pending}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Loader2 className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-foreground">{inProgress}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-foreground">{completed}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
