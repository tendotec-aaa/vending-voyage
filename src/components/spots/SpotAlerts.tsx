 import { fmt2, fmtPct, fmtPct0, fmtInt } from "@/lib/formatters";
 import { useNavigate } from "react-router-dom";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import {
   Collapsible,
   CollapsibleContent,
   CollapsibleTrigger,
 } from "@/components/ui/collapsible";
 import { ChevronDown, Package, TrendingDown, Wrench, ExternalLink } from "lucide-react";
 import { SpotAnalytics } from "@/hooks/useSpotAnalytics";
 import { useState } from "react";
 
 interface SpotAlertsProps {
   spots: SpotAnalytics[];
 }
 
 export function SpotAlerts({ spots }: SpotAlertsProps) {
   const navigate = useNavigate();
   const [openSections, setOpenSections] = useState({
     lowStock: true,
     unprofitable: true,
     maintenance: true,
   });
 
   const lowStockSpots = spots.filter((s) => s.stockPercentage < 25 && s.totalCapacity > 0);
   const unprofitableSpots = spots.filter((s) => s.roi < 0);
   const maintenanceSpots = spots.filter((s) => s.openTickets > 0);
 
   const toggleSection = (section: keyof typeof openSections) => {
     setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
   };
 
   const AlertSection = ({
     title,
     icon: Icon,
     count,
     isOpen,
     onToggle,
     children,
     variant,
   }: {
     title: string;
     icon: React.ElementType;
     count: number;
     isOpen: boolean;
     onToggle: () => void;
     children: React.ReactNode;
     variant: "warning" | "destructive" | "secondary";
   }) => (
     <Collapsible open={isOpen} onOpenChange={onToggle}>
       <Card className="bg-card border-border">
         <CollapsibleTrigger className="w-full">
           <CardHeader className="flex flex-row items-center justify-between py-4">
             <div className="flex items-center gap-3">
               <Icon className={`w-5 h-5 ${
                 variant === "destructive" ? "text-destructive" : 
                 variant === "warning" ? "text-yellow-500" : "text-muted-foreground"
               }`} />
               <CardTitle className="text-base font-medium">{title}</CardTitle>
               <Badge variant={variant === "warning" ? "secondary" : variant}>
                 {count}
               </Badge>
             </div>
             <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
           </CardHeader>
         </CollapsibleTrigger>
         <CollapsibleContent>
           <CardContent className="pt-0">{children}</CardContent>
         </CollapsibleContent>
       </Card>
     </Collapsible>
   );
 
   const AlertCard = ({
     spot,
     issue,
     actionLabel,
     actionPath,
   }: {
     spot: SpotAnalytics;
     issue: string;
     actionLabel: string;
     actionPath: string;
   }) => (
     <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
       <div>
         <p className="font-medium text-foreground">{spot.name}</p>
         <p className="text-sm text-muted-foreground">{spot.locationName}</p>
         <p className="text-sm text-destructive mt-1">{issue}</p>
       </div>
       <Button
         variant="outline"
         size="sm"
         onClick={() => navigate(actionPath)}
         className="gap-1"
       >
         {actionLabel}
         <ExternalLink className="w-3 h-3" />
       </Button>
     </div>
   );
 
   const hasNoAlerts = lowStockSpots.length === 0 && unprofitableSpots.length === 0 && maintenanceSpots.length === 0;
 
   if (hasNoAlerts) {
     return (
       <Card className="bg-card border-border">
         <CardContent className="py-12 text-center">
           <div className="text-4xl mb-4">🎉</div>
           <p className="text-lg font-medium text-foreground">All Clear!</p>
           <p className="text-muted-foreground">No alerts at this time. All spots are performing well.</p>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <div className="space-y-4">
       {/* Low Stock */}
       <AlertSection
         title="Low Stock Spots"
         icon={Package}
         count={lowStockSpots.length}
         isOpen={openSections.lowStock}
         onToggle={() => toggleSection("lowStock")}
         variant="warning"
       >
         {lowStockSpots.length === 0 ? (
           <p className="text-muted-foreground text-sm">No spots with low stock</p>
         ) : (
           <div className="space-y-2">
             {lowStockSpots.map((spot) => (
               <AlertCard
                 key={spot.id}
                 spot={spot}
                 issue={`${fmtPct0(spot.stockPercentage)}% stock remaining (${fmtInt(spot.currentStock)}/${fmtInt(spot.totalCapacity)})`}
                 actionLabel="View"
                 actionPath="/locations"
               />
             ))}
           </div>
         )}
       </AlertSection>
 
       {/* Unprofitable */}
       <AlertSection
         title="Unprofitable Spots"
         icon={TrendingDown}
         count={unprofitableSpots.length}
         isOpen={openSections.unprofitable}
         onToggle={() => toggleSection("unprofitable")}
         variant="destructive"
       >
         {unprofitableSpots.length === 0 ? (
           <p className="text-muted-foreground text-sm">All spots are profitable</p>
         ) : (
           <div className="space-y-2">
             {unprofitableSpots.map((spot) => (
               <AlertCard
                 key={spot.id}
                 spot={spot}
                 issue={`ROI: ${fmtPct(spot.roi)}% (Net: $${fmt2(spot.netProfit)})`}
                 actionLabel="Analyze"
                 actionPath="/analytics"
               />
             ))}
           </div>
         )}
       </AlertSection>
 
       {/* Maintenance */}
       <AlertSection
         title="Maintenance Required"
         icon={Wrench}
         count={maintenanceSpots.length}
         isOpen={openSections.maintenance}
         onToggle={() => toggleSection("maintenance")}
         variant="secondary"
       >
         {maintenanceSpots.length === 0 ? (
           <p className="text-muted-foreground text-sm">No open maintenance tickets</p>
         ) : (
           <div className="space-y-2">
             {maintenanceSpots.map((spot) => (
               <AlertCard
                 key={spot.id}
                 spot={spot}
                 issue={`${spot.openTickets} open ticket${spot.openTickets > 1 ? "s" : ""}`}
                 actionLabel="View Tickets"
                 actionPath="/maintenance"
               />
             ))}
           </div>
         )}
       </AlertSection>
     </div>
   );
 }