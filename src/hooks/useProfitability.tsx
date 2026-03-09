import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ExpenseCategory = 'payroll' | 'fuel' | 'maintenance' | 'location_commission' | 'software_utilities' | 'misc';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  payroll: 'Payroll',
  fuel: 'Fuel',
  maintenance: 'Maintenance',
  location_commission: 'Location Commission',
  software_utilities: 'Software & Utilities',
  misc: 'Miscellaneous',
};

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  payroll: 'hsl(var(--chart-1))',
  fuel: 'hsl(var(--chart-2))',
  maintenance: 'hsl(var(--chart-3))',
  location_commission: 'hsl(var(--chart-4))',
  software_utilities: 'hsl(var(--chart-5))',
  misc: 'hsl(var(--muted-foreground))',
};

interface OperatingExpense {
  id: string;
  amount: number;
  expense_date: string;
  category: ExpenseCategory;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export function useProfitability(year: number, month: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Month boundaries
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // last day of month
  const startStr = startDate.toISOString();
  const endStr = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  const { data, isLoading } = useQuery({
    queryKey: ['profitability', year, month],
    queryFn: async () => {
      // Fetch all in parallel
      const [visitsRes, lineItemsRes, purchaseItemsRes, discrepanciesRes, expensesRes] = await Promise.all([
        // 1. Revenue: spot_visits in month
        supabase
          .from('spot_visits')
          .select('id, total_cash_collected')
          .gte('visit_date', startStr)
          .lte('visit_date', endStr),

        // 2. Visit line items for COGS (units sold by product)
        supabase
          .from('visit_line_items')
          .select('product_id, units_sold, spot_visit_id')
          .gt('units_sold', 0),

        // 3. Purchase items for WAC calculation
        supabase
          .from('purchase_items')
          .select('item_detail_id, quantity_received, final_unit_cost')
          .gt('quantity_received', 0),

        // 4. Stock discrepancies for shrinkage (negative = missing)
        supabase
          .from('stock_discrepancy')
          .select('item_detail_id, difference')
          .gte('occurrence_date', startDateStr)
          .lte('occurrence_date', endDateStr)
          .lt('difference', 0),

        // 5. Operating expenses
        supabase
          .from('operating_expenses')
          .select('*')
          .gte('expense_date', startDateStr)
          .lte('expense_date', endDateStr)
          .order('expense_date', { ascending: false }),
      ]);

      // --- Revenue ---
      const grossRevenue = (visitsRes.data || []).reduce(
        (sum, v) => sum + (Number(v.total_cash_collected) || 0), 0
      );

      // Get visit IDs for this month to filter line items
      const visitIds = new Set((visitsRes.data || []).map(v => v.id));

      // --- WAC Map ---
      const wacMap = new Map<string, number>();
      const itemBatches = new Map<string, { totalCost: number; totalQty: number }>();
      for (const pi of purchaseItemsRes.data || []) {
        if (!pi.item_detail_id) continue;
        const existing = itemBatches.get(pi.item_detail_id) || { totalCost: 0, totalQty: 0 };
        existing.totalCost += (Number(pi.final_unit_cost) || 0) * (pi.quantity_received || 0);
        existing.totalQty += pi.quantity_received || 0;
        itemBatches.set(pi.item_detail_id, existing);
      }
      for (const [itemId, batch] of itemBatches) {
        wacMap.set(itemId, batch.totalQty > 0 ? batch.totalCost / batch.totalQty : 0);
      }

      // --- COGS (units sold) ---
      const unitsSoldByProduct = new Map<string, number>();
      for (const li of lineItemsRes.data || []) {
        if (!li.spot_visit_id || !visitIds.has(li.spot_visit_id)) continue;
        if (!li.product_id || !li.units_sold) continue;
        unitsSoldByProduct.set(
          li.product_id,
          (unitsSoldByProduct.get(li.product_id) || 0) + li.units_sold
        );
      }
      let cogsSold = 0;
      for (const [productId, qty] of unitsSoldByProduct) {
        cogsSold += qty * (wacMap.get(productId) || 0);
      }

      // --- Shrinkage COGS ---
      let shrinkageValue = 0;
      for (const d of discrepanciesRes.data || []) {
        if (!d.item_detail_id) continue;
        const missingUnits = Math.abs(d.difference);
        shrinkageValue += missingUnits * (wacMap.get(d.item_detail_id) || 0);
      }

      const cogs = cogsSold + shrinkageValue;
      const grossProfit = grossRevenue - cogs;

      // --- Operating Expenses ---
      const expenses = (expensesRes.data || []) as OperatingExpense[];
      const totalOpex = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

      // Group by category
      const expensesByCategory: Record<string, number> = {};
      for (const e of expenses) {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount);
      }

      const netProfit = grossProfit - totalOpex;

      // Cash discrepancy (info only) - sum of negative differences as absolute value
      const cashDiscrepancy = (discrepanciesRes.data || []).reduce(
        (sum, d) => sum + Math.abs(d.difference), 0
      );

      return {
        grossRevenue,
        cogsSold,
        shrinkageValue,
        cogs,
        grossProfit,
        totalOpex,
        netProfit,
        cashDiscrepancy,
        expensesByCategory,
        expensesList: expenses,
      };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const addExpense = useMutation({
    mutationFn: async (expense: {
      amount: number;
      expense_date: string;
      category: ExpenseCategory;
      description: string;
    }) => {
      const { error } = await supabase.from('operating_expenses').insert({
        amount: expense.amount,
        expense_date: expense.expense_date,
        category: expense.category as any,
        description: expense.description || null,
        created_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profitability', year, month] });
    },
  });

  return {
    data: data || {
      grossRevenue: 0,
      cogsSold: 0,
      shrinkageValue: 0,
      cogs: 0,
      grossProfit: 0,
      totalOpex: 0,
      netProfit: 0,
      cashDiscrepancy: 0,
      expensesByCategory: {},
      expensesList: [],
    },
    isLoading,
    addExpense,
  };
}
