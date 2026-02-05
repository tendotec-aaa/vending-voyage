 import { Card, CardContent } from "@/components/ui/card";
 import { TrendingUp, TrendingDown, Minus } from "lucide-react";
 import { SpotAnalytics } from "@/hooks/useSpotAnalytics";
 
 interface TopPerformerCardProps {
   spot: SpotAnalytics;
   rank: 1 | 2 | 3;
 }
 
 const medals = {
   1: "🥇",
   2: "🥈",
   3: "🥉",
 };
 
 const gradients = {
   1: "bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border-yellow-500/30",
   2: "bg-gradient-to-br from-slate-400/20 to-slate-500/10 border-slate-400/30",
   3: "bg-gradient-to-br from-orange-600/20 to-orange-700/10 border-orange-600/30",
 };
 
 export function TopPerformerCard({ spot, rank }: TopPerformerCardProps) {
   const TrendIcon = spot.trend === "up" ? TrendingUp : spot.trend === "down" ? TrendingDown : Minus;
   const trendColor = spot.trend === "up" ? "text-green-500" : spot.trend === "down" ? "text-destructive" : "text-muted-foreground";
 
   return (
     <Card className={`${gradients[rank]} border`}>
       <CardContent className="p-4">
         <div className="flex items-start justify-between mb-3">
           <div className="flex items-center gap-2">
             <span className="text-2xl">{medals[rank]}</span>
             <div>
               <p className="font-semibold text-foreground">{spot.name}</p>
               <p className="text-xs text-muted-foreground">{spot.locationName}</p>
             </div>
           </div>
           <TrendIcon className={`w-4 h-4 ${trendColor}`} />
         </div>
         
         <div className="grid grid-cols-3 gap-2 text-center">
           <div>
             <p className="text-lg font-bold text-foreground">
               ${spot.totalSales.toLocaleString()}
             </p>
             <p className="text-xs text-muted-foreground">Total Sales</p>
           </div>
           <div>
             <p className={`text-lg font-bold ${spot.netProfit >= 0 ? "text-green-500" : "text-destructive"}`}>
               ${spot.netProfit.toLocaleString()}
             </p>
             <p className="text-xs text-muted-foreground">Net Profit</p>
           </div>
           <div>
             <p className={`text-lg font-bold ${spot.roi >= 0 ? "text-green-500" : "text-destructive"}`}>
               {spot.roi.toFixed(1)}%
             </p>
             <p className="text-xs text-muted-foreground">ROI</p>
           </div>
         </div>
       </CardContent>
     </Card>
   );
 }