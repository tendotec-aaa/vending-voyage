 import { useState, useMemo } from "react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   LineChart,
   Line,
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   Legend,
   ResponsiveContainer,
 } from "recharts";
 import { SpotAnalytics, useSpotTrends } from "@/hooks/useSpotAnalytics";
 import { X } from "lucide-react";
 
 interface SpotTrendsProps {
   spots: SpotAnalytics[];
 }
 
 const TIME_RANGES = [
   { label: "7d", value: 7 },
   { label: "30d", value: 30 },
   { label: "90d", value: 90 },
   { label: "1y", value: 365 },
 ];
 
 const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];
 
 export function SpotTrends({ spots }: SpotTrendsProps) {
   const [selectedSpotIds, setSelectedSpotIds] = useState<string[]>([]);
   const [timeRange, setTimeRange] = useState(30);
 
   const { data: trendData, isLoading } = useSpotTrends(selectedSpotIds, timeRange);
 
   const addSpot = (spotId: string) => {
     if (selectedSpotIds.length < 3 && !selectedSpotIds.includes(spotId)) {
       setSelectedSpotIds([...selectedSpotIds, spotId]);
     }
   };
 
   const removeSpot = (spotId: string) => {
     setSelectedSpotIds(selectedSpotIds.filter((id) => id !== spotId));
   };
 
   const selectedSpots = spots.filter((s) => selectedSpotIds.includes(s.id));
   const availableSpots = spots.filter((s) => !selectedSpotIds.includes(s.id));
 
   // Transform data for Recharts
   const chartData = useMemo(() => {
     if (!trendData || trendData.length === 0) return [];
 
     const dateMap = new Map<string, Record<string, number>>();
     
     trendData.forEach((d) => {
       if (!dateMap.has(d.date)) {
         dateMap.set(d.date, { date: d.date } as any);
       }
       const entry = dateMap.get(d.date)!;
       entry[d.spotId] = d.sales;
     });
 
     return Array.from(dateMap.values()).sort((a: any, b: any) => 
       a.date.localeCompare(b.date)
     );
   }, [trendData]);
 
   return (
     <div className="space-y-6">
       {/* Controls */}
       <Card className="bg-card border-border">
         <CardContent className="p-4">
           <div className="flex flex-col sm:flex-row gap-4">
             {/* Spot Selector */}
             <div className="flex-1">
               <label className="text-sm font-medium text-foreground mb-2 block">
                 Compare Spots (up to 3)
               </label>
               <div className="flex flex-wrap gap-2 mb-2">
                 {selectedSpots.map((spot, idx) => (
                   <Badge
                     key={spot.id}
                     variant="secondary"
                     className="gap-1 pr-1"
                     style={{ borderLeftColor: COLORS[idx], borderLeftWidth: 3 }}
                   >
                     {spot.name}
                     <button
                       onClick={() => removeSpot(spot.id)}
                       className="ml-1 hover:bg-muted rounded-full p-0.5"
                     >
                       <X className="w-3 h-3" />
                     </button>
                   </Badge>
                 ))}
               </div>
               {selectedSpotIds.length < 3 && (
                 <Select onValueChange={addSpot}>
                   <SelectTrigger className="w-full sm:w-64">
                     <SelectValue placeholder="Add spot to compare..." />
                   </SelectTrigger>
                   <SelectContent>
                     {availableSpots.map((spot) => (
                       <SelectItem key={spot.id} value={spot.id}>
                         {spot.name} - {spot.locationName}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               )}
             </div>
 
             {/* Time Range */}
             <div>
               <label className="text-sm font-medium text-foreground mb-2 block">
                 Time Range
               </label>
               <div className="flex gap-1">
                 {TIME_RANGES.map((range) => (
                   <Button
                     key={range.value}
                     variant={timeRange === range.value ? "default" : "outline"}
                     size="sm"
                     onClick={() => setTimeRange(range.value)}
                   >
                     {range.label}
                   </Button>
                 ))}
               </div>
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Chart */}
       <Card className="bg-card border-border">
         <CardHeader>
           <CardTitle className="text-lg">Sales Trends</CardTitle>
         </CardHeader>
         <CardContent>
           {selectedSpotIds.length === 0 ? (
             <div className="h-[300px] flex items-center justify-center text-muted-foreground">
               Select spots above to compare their sales trends
             </div>
           ) : isLoading ? (
             <div className="h-[300px] flex items-center justify-center text-muted-foreground">
               Loading trend data...
             </div>
           ) : chartData.length === 0 ? (
             <div className="h-[300px] flex items-center justify-center text-muted-foreground">
               No sales data available for the selected period
             </div>
           ) : (
             <ResponsiveContainer width="100%" height={300}>
               <LineChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                 <XAxis 
                   dataKey="date" 
                   tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                   tickFormatter={(value) => {
                     const date = new Date(value);
                     return `${date.getMonth() + 1}/${date.getDate()}`;
                   }}
                 />
                 <YAxis 
                   tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                   tickFormatter={(value) => `$${value}`}
                 />
                 <Tooltip
                   contentStyle={{
                     backgroundColor: "hsl(var(--card))",
                     border: "1px solid hsl(var(--border))",
                     borderRadius: "8px",
                   }}
                   labelStyle={{ color: "hsl(var(--foreground))" }}
                   formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                 />
                 <Legend />
                 {selectedSpots.map((spot, idx) => (
                   <Line
                     key={spot.id}
                     type="monotone"
                     dataKey={spot.id}
                     name={spot.name}
                     stroke={COLORS[idx]}
                     strokeWidth={2}
                     dot={false}
                   />
                 ))}
               </LineChart>
             </ResponsiveContainer>
           )}
         </CardContent>
       </Card>
     </div>
   );
 }