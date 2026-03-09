import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_COLORS, type ExpenseCategory } from '@/hooks/useProfitability';
import { fmt2 } from '@/lib/formatters';

interface ExpenseBreakdownChartProps {
  expensesByCategory: Record<string, number>;
}

export function ExpenseBreakdownChart({ expensesByCategory }: ExpenseBreakdownChartProps) {
  const data = Object.entries(expensesByCategory)
    .filter(([, val]) => val > 0)
    .map(([key, value]) => ({
      name: EXPENSE_CATEGORY_LABELS[key as ExpenseCategory] || key,
      value,
      color: EXPENSE_CATEGORY_COLORS[key as ExpenseCategory] || 'hsl(var(--muted-foreground))',
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No expenses recorded this month
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => `$${fmt2(value)}`}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            color: 'hsl(var(--popover-foreground))',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
