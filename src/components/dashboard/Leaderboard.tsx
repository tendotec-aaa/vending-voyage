import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";

export interface LeaderboardItem {
  name: string;
  value: number;
  pctChange: number;
}

interface LeaderboardProps {
  title: string;
  items: LeaderboardItem[];
  formatValue: (n: number) => string;
  isLoading?: boolean;
  period: "weekly" | "monthly";
  onPeriodChange: (period: "weekly" | "monthly") => void;
}

const rankColors = [
  "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  "bg-secondary text-secondary-foreground",
  "bg-secondary text-secondary-foreground",
];

export function Leaderboard({
  title,
  items,
  formatValue,
  isLoading,
  period,
  onPeriodChange,
}: LeaderboardProps) {
  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          <Label htmlFor={`lb-${title}`} className="text-xs text-muted-foreground">
            {period === "weekly" ? "Weekly" : "Monthly"}
          </Label>
          <Switch
            id={`lb-${title}`}
            checked={period === "monthly"}
            onCheckedChange={(checked) => onPeriodChange(checked ? "monthly" : "weekly")}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Trophy className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No data for this period</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const sign = item.pctChange >= 0 ? "+" : "";
            const pctColor =
              item.pctChange > 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : item.pctChange < 0
                ? "bg-destructive/10 text-destructive"
                : "bg-secondary text-secondary-foreground";

            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border"
              >
                <Badge className={`${rankColors[idx]} w-7 h-7 flex items-center justify-center text-sm font-bold`}>
                  {idx + 1}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                </div>
                <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                  {formatValue(item.value)}
                </span>
                <Badge className={`${pctColor} text-xs`}>
                  {sign}{item.pctChange.toFixed(1)}%
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
