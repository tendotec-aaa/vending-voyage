import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export function KPICard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon,
  iconColor = "text-primary"
}: KPICardProps) {
  return (
    <Card className="p-6 bg-card border-border hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          {change && (
            <p className={cn(
              "text-sm mt-2 font-medium",
              changeType === "positive" && "text-emerald-600",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground"
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl bg-primary/10", iconColor.replace("text-", "bg-").replace("600", "100"))}>
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>
      </div>
    </Card>
  );
}
