import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ItemPerformanceRow {
  itemId: string;
  itemTypeId: string;
  name: string;
  sku: string;
  unitsSold: number;
  distinctMachines: number;
  velocity: number;
  avgSalePrice: number;
  wac: number;
  roi: number;
  grossProfit: number;
  currentStock: number;
  stockCover: number;
  isTopNotch: boolean;
}

export interface MachineSalesRow {
  machineId: string;
  serialNumber: string;
  locationName: string;
  unitsSold: number;
  velocity: number;
}

export interface MonthTrend {
  month: string;
  units: number;
}

export function useItemAnalytics(year: number, month: number) {
  const { user } = useAuth();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const daysInMonth = endDate.getDate();
  const startStr = startDate.toISOString();
  const endStr = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

  // 3-month range for trend
  const m2Start = new Date(year, month - 3, 1).toISOString();

  return useQuery({
    queryKey: ['item-analytics', year, month],
    queryFn: async () => {
      const [
        itemsRes,
        visitsRes,
        lineItemsRes,
        purchaseItemsRes,
        slotsRes,
        inventoryRes,
        machinesRes,
        spotsRes,
      ] = await Promise.all([
        // 1. Items with their type flags (filter client-side for sellable OR component)
        supabase
          .from('item_details')
          .select('id, name, sku, item_type_id, item_types(is_sellable, is_component)'),

        // 2. Visits for selected month
        supabase
          .from('spot_visits')
          .select('id, visit_date, spot_id')
          .gte('visit_date', startStr)
          .lte('visit_date', endStr),

        // 3. All visit line items for 3-month window (for trend + current)
        supabase
          .from('visit_line_items')
          .select('product_id, units_sold, machine_id, spot_visit_id')
          .gt('units_sold', 0),

        // 4. Purchase items for WAC
        supabase
          .from('purchase_items')
          .select('item_detail_id, quantity_received, final_unit_cost')
          .gt('quantity_received', 0),

        // 5. Machine slots for avg sale price
        supabase
          .from('machine_slots')
          .select('current_product_id, coin_acceptor, machine_id'),

        // 6. Current inventory stock
        supabase
          .from('inventory')
          .select('item_detail_id, quantity_on_hand'),

        // 7. Machines for serial + setup mapping
        supabase
          .from('machines')
          .select('id, serial_number, setup_id, setups(spot_id, spots(location_id, locations(name)))'),

        // 8. 3-month visits for trend
        supabase
          .from('spot_visits')
          .select('id, visit_date')
          .gte('visit_date', m2Start)
          .lte('visit_date', endStr),
      ]);

      const allItems = (itemsRes.data || []) as any[];
      const sellableItems = allItems.filter(i => {
        const t = i.item_types;
        return t?.is_sellable || t?.is_component;
      });
      const sellableIds = new Set(sellableItems.map(i => i.id));

      // Visit IDs for current month
      const currentVisitIds = new Set((visitsRes.data || []).map(v => v.id));

      // All 3-month visit IDs with month label
      const allVisits = (spotsRes.data || []) as { id: string; visit_date: string }[];
      const visitMonthMap = new Map<string, string>(); // visitId -> "YYYY-MM"
      for (const v of allVisits) {
        const d = new Date(v.visit_date);
        visitMonthMap.set(v.id, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }

      // --- WAC Map ---
      const itemBatches = new Map<string, { totalCost: number; totalQty: number }>();
      for (const pi of purchaseItemsRes.data || []) {
        if (!pi.item_detail_id) continue;
        const e = itemBatches.get(pi.item_detail_id) || { totalCost: 0, totalQty: 0 };
        e.totalCost += (Number(pi.final_unit_cost) || 0) * (pi.quantity_received || 0);
        e.totalQty += pi.quantity_received || 0;
        itemBatches.set(pi.item_detail_id, e);
      }
      const wacMap = new Map<string, number>();
      for (const [id, b] of itemBatches) {
        wacMap.set(id, b.totalQty > 0 ? b.totalCost / b.totalQty : 0);
      }

      // --- Avg sale price per product from slots ---
      const slotPrices = new Map<string, { sum: number; count: number }>();
      for (const s of slotsRes.data || []) {
        if (!s.current_product_id || !s.coin_acceptor) continue;
        const e = slotPrices.get(s.current_product_id) || { sum: 0, count: 0 };
        e.sum += Number(s.coin_acceptor);
        e.count += 1;
        slotPrices.set(s.current_product_id, e);
      }
      const avgPriceMap = new Map<string, number>();
      for (const [id, p] of slotPrices) {
        avgPriceMap.set(id, p.sum / p.count);
      }

      // --- Current stock ---
      const stockMap = new Map<string, number>();
      for (const inv of inventoryRes.data || []) {
        if (!inv.item_detail_id) continue;
        stockMap.set(inv.item_detail_id, (stockMap.get(inv.item_detail_id) || 0) + (inv.quantity_on_hand || 0));
      }

      // --- Current month sales aggregation ---
      const salesAgg = new Map<string, { units: number; machines: Set<string> }>();
      // --- 3-month trend aggregation ---
      const trendAgg = new Map<string, Map<string, number>>(); // itemId -> month -> units
      // --- Machine-level drill-down (current month) ---
      const machineSales = new Map<string, Map<string, number>>(); // itemId -> machineId -> units

      for (const li of lineItemsRes.data || []) {
        if (!li.product_id || !li.spot_visit_id || !sellableIds.has(li.product_id)) continue;

        // Current month
        if (currentVisitIds.has(li.spot_visit_id)) {
          const agg = salesAgg.get(li.product_id) || { units: 0, machines: new Set<string>() };
          agg.units += li.units_sold;
          if (li.machine_id) agg.machines.add(li.machine_id);
          salesAgg.set(li.product_id, agg);

          // Machine drill-down
          if (li.machine_id) {
            const mMap = machineSales.get(li.product_id) || new Map<string, number>();
            mMap.set(li.machine_id, (mMap.get(li.machine_id) || 0) + li.units_sold);
            machineSales.set(li.product_id, mMap);
          }
        }

        // Trend (3 months)
        const monthLabel = visitMonthMap.get(li.spot_visit_id);
        if (monthLabel) {
          const tMap = trendAgg.get(li.product_id) || new Map<string, number>();
          tMap.set(monthLabel, (tMap.get(monthLabel) || 0) + li.units_sold);
          trendAgg.set(li.product_id, tMap);
        }
      }

      // Build machine lookup
      const machineInfo = new Map<string, { serial: string; locationName: string }>();
      for (const m of machinesRes.data || []) {
        const setup = m.setups as any;
        const locName = setup?.spots?.locations?.name || 'Unknown';
        machineInfo.set(m.id, { serial: m.serial_number, locationName: locName });
      }

      // --- Build rows ---
      const rows: ItemPerformanceRow[] = [];
      for (const item of sellableItems) {
        const agg = salesAgg.get(item.id);
        const unitsSold = agg?.units || 0;
        const distinctMachines = agg?.machines.size || 0;
        const velocity = distinctMachines > 0 ? unitsSold / distinctMachines / daysInMonth : 0;
        const wac = wacMap.get(item.id) || 0;
        const avgPrice = avgPriceMap.get(item.id) || 0;
        const roi = wac > 0 ? ((avgPrice - wac) / wac) * 100 : 0;
        const grossProfit = unitsSold * (avgPrice - wac);
        const currentStock = stockMap.get(item.id) || 0;
        const dailyUsage = distinctMachines > 0 ? velocity * distinctMachines : 0;
        const stockCover = dailyUsage > 0 ? currentStock / dailyUsage : currentStock > 0 ? 999 : 0;

        rows.push({
          itemId: item.id,
          name: item.name,
          sku: item.sku,
          unitsSold,
          distinctMachines,
          velocity,
          avgSalePrice: avgPrice,
          wac,
          roi,
          grossProfit,
          currentStock,
          stockCover,
          isTopNotch: false, // computed below
        });
      }

      // Compute Top Notch: ROI > 300% AND velocity in top 20th percentile
      const velocities = rows.filter(r => r.velocity > 0).map(r => r.velocity).sort((a, b) => a - b);
      const p80Index = Math.floor(velocities.length * 0.8);
      const velocityP80 = velocities[p80Index] || Infinity;
      for (const r of rows) {
        r.isTopNotch = r.roi > 300 && r.velocity >= velocityP80 && r.velocity > 0;
      }

      // Sort by velocity desc
      rows.sort((a, b) => b.velocity - a.velocity);

      // Build trend data
      const currentMonthLabel = `${year}-${String(month).padStart(2, '0')}`;
      const m1 = new Date(year, month - 2, 1);
      const m1Label = `${m1.getFullYear()}-${String(m1.getMonth() + 1).padStart(2, '0')}`;
      const m2 = new Date(year, month - 3, 1);
      const m2Label = `${m2.getFullYear()}-${String(m2.getMonth() + 1).padStart(2, '0')}`;
      const trendLabels = [m2Label, m1Label, currentMonthLabel];

      const getTrend = (itemId: string): MonthTrend[] => {
        const tMap = trendAgg.get(itemId);
        return trendLabels.map(m => ({ month: m, units: tMap?.get(m) || 0 }));
      };

      const getMachineRanking = (itemId: string): MachineSalesRow[] => {
        const mMap = machineSales.get(itemId);
        if (!mMap) return [];
        return Array.from(mMap.entries())
          .map(([machineId, units]) => {
            const info = machineInfo.get(machineId) || { serial: machineId.slice(0, 8), locationName: 'Unknown' };
            return {
              machineId,
              serialNumber: info.serial,
              locationName: info.locationName,
              unitsSold: units,
              velocity: units / daysInMonth,
            };
          })
          .sort((a, b) => b.velocity - a.velocity);
      };

      return { rows, getTrend, getMachineRanking, daysInMonth };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}
