import { fmt2, fmtPct, fmtPct0 } from "@/lib/formatters";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, ArrowUpDown, Calendar, Eye, Clock } from "lucide-react";
import { SpotAnalytics } from "@/hooks/useSpotAnalytics";
import { TopPerformerCard } from "./TopPerformerCard";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";

type SortKey = "totalSales" | "netProfit" | "roi" | "stockPercentage" | "totalAccruedRent" | "daysActive" | "visitCount";
type SortDir = "asc" | "desc";

interface SpotLeaderboardProps {
  spots: SpotAnalytics[];
}

export function SpotLeaderboard({ spots }: SpotLeaderboardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sortKey, setSortKey] = useState<SortKey>("netProfit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedSpots = [...spots].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  const topThree = sortedSpots.slice(0, 3);
  const rankedSpots = sortedSpots.map((spot, idx) => ({ ...spot, rank: idx + 1 }));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortButton = ({ column, label }: { column: SortKey; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-medium text-muted-foreground hover:text-foreground"
      onClick={() => handleSort(column)}
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  const TrendIcon = ({ trend }: { trend: string }) => {
    const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
    const color = trend === "up" ? "text-green-500" : trend === "down" ? "text-destructive" : "text-muted-foreground";
    return <Icon className={`w-4 h-4 ${color}`} />;
  };

  const formatLastVisit = (date: string | null) => {
    if (!date) return "—";
    return format(new Date(date), "MMM d, yyyy");
  };

  return (
    <div className="space-y-6">
      {/* Top 3 Performers */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((spot, idx) => (
            <TopPerformerCard
              key={spot.id}
              spot={spot}
              rank={(idx + 1) as 1 | 2 | 3}
            />
          ))}
        </div>
      )}

      {/* Mobile: Card layout */}
      {isMobile ? (
        <div className="space-y-3">
          {/* Mobile sort selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('spots.sortBy')}</span>
            <select
              className="text-xs bg-card border border-border rounded px-2 py-1 text-foreground"
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value as SortKey);
                setSortDir("desc");
              }}
            >
              <option value="netProfit">{t('spots.profit')}</option>
              <option value="totalSales">{t('spots.sales')}</option>
              <option value="totalAccruedRent">{t('spots.rent')}</option>
              <option value="roi">{t('spots.roi')}</option>
              <option value="daysActive">{t('spots.daysOpen')}</option>
              <option value="visitCount">{t('spots.visits')}</option>
              <option value="stockPercentage">{t('spots.stock')}</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
            >
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </div>

          {rankedSpots.map((spot) => {
            const isProfitable = spot.netProfit >= 0;
            const cardBg = isProfitable
              ? "border-green-500/20"
              : "border-destructive/20";

            return (
              <Card
                key={spot.id}
                className={`p-4 cursor-pointer hover:bg-muted/50 ${cardBg}`}
                onClick={() => navigate(`/spots/${spot.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground">#{spot.rank}</span>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{spot.name}</p>
                      <p className="text-xs text-muted-foreground">{spot.locationName}</p>
                    </div>
                  </div>
                  <TrendIcon trend={spot.trend} />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('spots.sales')}</p>
                    <p className="text-sm font-semibold text-foreground">${fmt2(spot.totalSales)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('spots.rent')}</p>
                    <p className="text-sm font-medium text-muted-foreground">${fmt2(spot.totalAccruedRent)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('spots.profit')}</p>
                    <p className={`text-sm font-semibold ${isProfitable ? "text-green-500" : "text-destructive"}`}>
                      ${fmt2(spot.netProfit)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('spots.roi')}</p>
                    <p className={`text-xs font-medium ${spot.roi >= 0 ? "text-green-500" : "text-destructive"}`}>
                      {fmtPct(spot.roi)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('spots.days')}</p>
                    <p className="text-xs font-medium text-foreground">{spot.daysActive}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('spots.visits')}</p>
                    <p className="text-xs font-medium text-foreground">{spot.visitCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('spots.stock')}</p>
                    <div className="flex items-center gap-1">
                      <Progress value={spot.stockPercentage} className="flex-1 h-1.5" />
                      <span className="text-[10px] text-muted-foreground">{fmtPct0(spot.stockPercentage)}%</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Desktop: Table layout */
        <Card className="bg-card border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground w-14">{t('spots.rank')}</TableHead>
                <TableHead className="text-muted-foreground">{t('spots.spot')}</TableHead>
                <TableHead className="text-muted-foreground">{t('spots.location')}</TableHead>
                <TableHead className="text-muted-foreground text-right">
                  <SortButton column="totalSales" label={t('spots.sales')} />
                </TableHead>
                <TableHead className="text-muted-foreground text-right">
                  <SortButton column="totalAccruedRent" label={t('spots.rent')} />
                </TableHead>
                <TableHead className="text-muted-foreground text-right">
                  <SortButton column="netProfit" label={t('spots.profit')} />
                </TableHead>
                <TableHead className="text-muted-foreground text-right">
                  <SortButton column="roi" label={t('spots.roi')} />
                </TableHead>
                <TableHead className="text-muted-foreground text-center">
                  <SortButton column="daysActive" label={t('spots.days')} />
                </TableHead>
                <TableHead className="text-muted-foreground text-center">
                  <SortButton column="visitCount" label={t('spots.visits')} />
                </TableHead>
                <TableHead className="text-muted-foreground">
                  <SortButton column="stockPercentage" label={t('spots.stock')} />
                </TableHead>
                <TableHead className="text-muted-foreground w-20">{t('spots.lastVisit')}</TableHead>
                <TableHead className="text-muted-foreground w-12">{t('spots.trend')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankedSpots.map((spot) => {
                const isProfitable = spot.netProfit >= 0;
                const rowBg = isProfitable
                  ? "bg-green-500/5 hover:bg-green-500/10"
                  : "bg-destructive/5 hover:bg-destructive/10";

                return (
                  <TableRow
                    key={spot.id}
                    className={`border-border cursor-pointer ${rowBg}`}
                    onClick={() => navigate(`/spots/${spot.id}`)}
                  >
                    <TableCell className="font-bold text-foreground">#{spot.rank}</TableCell>
                    <TableCell className="font-medium text-foreground">{spot.name}</TableCell>
                    <TableCell className="text-muted-foreground">{spot.locationName}</TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      ${fmt2(spot.totalSales)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ${fmt2(spot.totalAccruedRent)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${isProfitable ? "text-green-500" : "text-destructive"}`}>
                      ${fmt2(spot.netProfit)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${spot.roi >= 0 ? "text-green-500" : "text-destructive"}`}>
                      {fmtPct(spot.roi)}%
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {spot.daysActive}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {spot.visitCount}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress value={spot.stockPercentage} className="flex-1 h-2" />
                        <span className="text-xs text-muted-foreground w-8">
                          {fmtPct0(spot.stockPercentage)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatLastVisit(spot.lastVisitDate)}
                    </TableCell>
                    <TableCell>
                      <TrendIcon trend={spot.trend} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
