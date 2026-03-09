import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ExpenseCategory = 'payroll' | 'fuel' | 'maintenance' | 'location_commission' | 'software_utilities' | 'misc' | 'rent' | 'depreciation';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  payroll: 'Payroll',
  fuel: 'Fuel',
  maintenance: 'Maintenance',
  location_commission: 'Location Commission',
  software_utilities: 'Software & Utilities',
  misc: 'Miscellaneous',
  rent: 'Rent',
  depreciation: 'Depreciation',
};

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  payroll: 'hsl(var(--chart-1))',
  fuel: 'hsl(var(--chart-2))',
  maintenance: 'hsl(var(--chart-3))',
  location_commission: 'hsl(var(--chart-4))',
  software_utilities: 'hsl(var(--chart-5))',
  misc: 'hsl(var(--muted-foreground))',
  rent: 'hsl(var(--chart-1))',
  depreciation: 'hsl(var(--chart-2))',
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

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const startStr = startDate.toISOString();
  const endStr = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

  const { data, isLoading } = useQuery({
    queryKey: ['profitability', year, month],
    queryFn: async () => {
      const [visitsRes, lineItemsRes, purchaseItemsRes, discrepanciesRes, expensesRes] = await Promise.all([
        supabase
          .from('spot_visits')
          .select('id, total_cash_collected')
          .gte('visit_date', startStr)
          .lte('visit_date', endStr),
        supabase
          .from('visit_line_items' as any)
          .select('product_id, units_sold, spot_visit_id')
          .gt('units_sold', 0),
        supabase
          .from('purchase_items')
          .select('item_detail_id, quantity_received, final_unit_cost')
          .gt('quantity_received', 0),
        supabase
          .from('stock_discrepancy')
          .select('item_detail_id, difference')
          .gte('occurrence_date', startDateStr)
          .lte('occurrence_date', endDateStr)
          .lt('difference', 0),
        supabase
          .from('operating_expenses')
          .select('*')
          .gte('expense_date', startDateStr)
          .lte('expense_date', endDateStr)
          .order('expense_date', { ascending: false }),
      ]);

      const grossRevenue = (visitsRes.data || []).reduce(
        (sum, v) => sum + (Number(v.total_cash_collected) || 0), 0
      );
      const visitIds = new Set((visitsRes.data || []).map(v => v.id));

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

      const unitsSoldByProduct = new Map<string, number>();
      for (const li of (lineItemsRes.data || []) as any[]) {
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

      let shrinkageValue = 0;
      for (const d of discrepanciesRes.data || []) {
        if (!d.item_detail_id) continue;
        const missingUnits = Math.abs(d.difference);
        shrinkageValue += missingUnits * (wacMap.get(d.item_detail_id) || 0);
      }

      const cogs = cogsSold + shrinkageValue;
      const grossProfit = grossRevenue - cogs;

      const expenses = (expensesRes.data || []) as OperatingExpense[];
      const totalOpex = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

      const expensesByCategory: Record<string, number> = {};
      for (const e of expenses) {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount);
      }

      const netProfit = grossProfit - totalOpex;

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

  // Check if overhead has been posted for this month
  const { data: overheadStatus } = useQuery({
    queryKey: ['overhead-status', yearMonth],
    queryFn: async () => {
      const { data: postings, error } = await supabase
        .from('overhead_postings' as any)
        .select('id, posting_type')
        .eq('year_month', yearMonth);
      if (error) throw error;
      return {
        isPosted: (postings || []).length > 0,
        count: (postings || []).length,
      };
    },
    enabled: !!user?.id,
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

  // Generate Monthly Overhead mutation
  const generateOverhead = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // 1. Check if already posted
      const { data: existing } = await supabase
        .from('overhead_postings' as any)
        .select('id')
        .eq('year_month', yearMonth)
        .limit(1);
      if (existing && existing.length > 0) {
        throw new Error('Overhead already generated for this month');
      }

      const expenseDate = `${year}-${String(month).padStart(2, '0')}-01`;

      // 2. Fetch active locations with rent
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name, rent_amount')
        .gt('rent_amount', 0);

      // 3. Fetch active setups with machines and depreciation
      const { data: setups } = await supabase
        .from('setups')
        .select('id, name, spot_id, machines(id, model_id, item_details:model_id(name, monthly_depreciation))')
        .not('spot_id', 'is', null);

      // Also fetch spot names for descriptions
      const spotIds = (setups || []).map((s: any) => s.spot_id).filter(Boolean);
      const { data: spots } = spotIds.length > 0
        ? await supabase.from('spots').select('id, name').in('id', spotIds)
        : { data: [] };
      const spotNameMap = new Map((spots || []).map((s: any) => [s.id, s.name]));

      // 4. Insert rent expenses
      for (const loc of locations || []) {
        const rentAmount = Number(loc.rent_amount) || 0;
        if (rentAmount <= 0) continue;

        const { data: expenseRow, error: expErr } = await supabase
          .from('operating_expenses')
          .insert({
            amount: rentAmount,
            expense_date: expenseDate,
            category: 'rent' as any,
            description: `Rent — ${loc.name}`,
            created_by: user.id,
          })
          .select('id')
          .single();
        if (expErr) throw expErr;

        const { error: postErr } = await supabase
          .from('overhead_postings' as any)
          .insert({
            year_month: yearMonth,
            location_id: loc.id,
            expense_id: expenseRow.id,
            posting_type: 'rent',
            posted_by: user.id,
          });
        if (postErr) throw postErr;
      }

      // 5. Insert depreciation expenses
      for (const setup of setups || []) {
        const machines = (setup as any).machines || [];
        let totalDep = 0;
        for (const m of machines) {
          const model = m.item_details;
          totalDep += Number(model?.monthly_depreciation) || 0;
        }
        if (totalDep <= 0) continue;

        const spotName = spotNameMap.get((setup as any).spot_id) || (setup as any).name || 'Setup';
        const { data: expenseRow, error: expErr } = await supabase
          .from('operating_expenses')
          .insert({
            amount: totalDep,
            expense_date: expenseDate,
            category: 'depreciation' as any,
            description: `Depreciation — ${spotName}`,
            created_by: user.id,
          })
          .select('id')
          .single();
        if (expErr) throw expErr;

        const { error: postErr } = await supabase
          .from('overhead_postings' as any)
          .insert({
            year_month: yearMonth,
            setup_id: setup.id,
            expense_id: expenseRow.id,
            posting_type: 'depreciation',
            posted_by: user.id,
          });
        if (postErr) throw postErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profitability', year, month] });
      queryClient.invalidateQueries({ queryKey: ['overhead-status', yearMonth] });
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
    generateOverhead,
    isOverheadPosted: overheadStatus?.isPosted || false,
    overheadCount: overheadStatus?.count || 0,
  };
}
