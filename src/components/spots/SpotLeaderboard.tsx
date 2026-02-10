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
 import { TrendingUp, TrendingDown, Minus, ArrowUpDown } from "lucide-react";
 import { SpotAnalytics } from "@/hooks/useSpotAnalytics";
 import { TopPerformerCard } from "./TopPerformerCard";
 import { Button } from "@/components/ui/button";
 
 type SortKey = "totalSales" | "netProfit" | "roi" | "stockPercentage" | "rentAmount";
 type SortDir = "asc" | "desc";
 
 interface SpotLeaderboardProps {
   spots: SpotAnalytics[];
 }
 
 export function SpotLeaderboard({ spots }: SpotLeaderboardProps) {
   const navigate = useNavigate();
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
 
       {/* Full Table */}
       <Card className="bg-card border-border">
         <Table>
           <TableHeader>
             <TableRow className="border-border">
               <TableHead className="text-muted-foreground w-16">Rank</TableHead>
               <TableHead className="text-muted-foreground">Spot Name</TableHead>
               <TableHead className="text-muted-foreground">Location</TableHead>
               <TableHead className="text-muted-foreground text-right">
                 <SortButton column="totalSales" label="Total Sales" />
               </TableHead>
               <TableHead className="text-muted-foreground text-right">
                 <SortButton column="rentAmount" label="Total Rent" />
               </TableHead>
               <TableHead className="text-muted-foreground text-right">
                 <SortButton column="netProfit" label="Sales - Rent" />
               </TableHead>
               <TableHead className="text-muted-foreground text-right">
                 <SortButton column="roi" label="ROI %" />
               </TableHead>
               <TableHead className="text-muted-foreground">
                 <SortButton column="stockPercentage" label="Stock Level" />
               </TableHead>
               <TableHead className="text-muted-foreground w-16">Trend</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {rankedSpots.map((spot) => {
               const isProfitable = spot.netProfit >= 0;
               const rowBg = isProfitable 
                 ? "bg-green-500/5 hover:bg-green-500/10" 
                 : "bg-destructive/5 hover:bg-destructive/10";
               
               const TrendIcon = spot.trend === "up" ? TrendingUp : spot.trend === "down" ? TrendingDown : Minus;
               const trendColor = spot.trend === "up" ? "text-green-500" : spot.trend === "down" ? "text-destructive" : "text-muted-foreground";
 
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
                     ${spot.totalSales.toLocaleString()}
                   </TableCell>
                   <TableCell className="text-right text-muted-foreground">
                     ${spot.rentAmount.toLocaleString()}
                   </TableCell>
                   <TableCell className={`text-right font-medium ${isProfitable ? "text-green-500" : "text-destructive"}`}>
                     ${spot.netProfit.toLocaleString()}
                   </TableCell>
                   <TableCell className={`text-right font-medium ${spot.roi >= 0 ? "text-green-500" : "text-destructive"}`}>
                     {spot.roi.toFixed(1)}%
                   </TableCell>
                   <TableCell>
                     <div className="flex items-center gap-2 min-w-[120px]">
                       <Progress value={spot.stockPercentage} className="flex-1 h-2" />
                       <span className="text-xs text-muted-foreground w-10">
                         {spot.stockPercentage.toFixed(0)}%
                       </span>
                     </div>
                   </TableCell>
                   <TableCell>
                     <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                   </TableCell>
                 </TableRow>
               );
             })}
           </TableBody>
         </Table>
       </Card>
     </div>
   );
 }