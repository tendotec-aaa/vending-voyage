import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, DollarSign, TrendingUp, TrendingDown, ShoppingCart, Briefcase, AlertTriangle, Zap, CheckCircle } from 'lucide-react';
import { useProfitability, EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/hooks/useProfitability';
import { ExpenseBreakdownChart } from '@/components/profitability/ExpenseBreakdownChart';
import { AddExpenseDialog } from '@/components/profitability/AddExpenseDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { fmt2 } from '@/lib/formatters';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const MONTH_KEYS = [
  'months.january', 'months.february', 'months.march', 'months.april',
  'months.may', 'months.june', 'months.july', 'months.august',
  'months.september', 'months.october', 'months.november', 'months.december',
];

export default function Profitability() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const { t } = useTranslation();

  const { data, isLoading, addExpense, generateOverhead, isOverheadPosted, overheadCount } = useProfitability(year, month);
  const { has, isAdmin } = usePermissions();
  const canManageExpenses = isAdmin || has('manage_expenses' as any);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const defaultExpenseDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthName = t(MONTH_KEYS[month - 1]);

  const handleGenerateOverhead = async () => {
    try {
      await generateOverhead.mutateAsync();
      toast.success(t('profitability.generateOverhead') + ' ✓');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate overhead');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('profitability.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('profitability.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_KEYS.map((key, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{t(key)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" /> {t('profitability.grossRevenue')}
                  </div>
                  <p className="text-2xl font-bold text-foreground">${fmt2(data.grossRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('profitability.actualCash')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <ShoppingCart className="h-4 w-4" /> {t('profitability.cogs')}
                  </div>
                  <p className="text-2xl font-bold text-foreground">${fmt2(data.cogs)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('profitability.sold')}: ${fmt2(data.cogsSold)} · {t('profitability.shrinkage')}: ${fmt2(data.shrinkageValue)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" /> {t('profitability.grossProfit')}
                  </div>
                  <p className={`text-2xl font-bold ${data.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                    ${fmt2(data.grossProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('profitability.margin')}: {data.grossRevenue > 0 ? fmt2((data.grossProfit / data.grossRevenue) * 100) : '0.00'}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Briefcase className="h-4 w-4" /> {t('profitability.operatingExpenses')}
                  </div>
                  <p className="text-2xl font-bold text-foreground">${fmt2(data.totalOpex)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('profitability.allPostedExpenses')}</p>
                </CardContent>
              </Card>

              <Card className={`border-2 ${data.netProfit >= 0 ? 'border-green-500/50' : 'border-destructive/50'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    {data.netProfit >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    {t('profitability.netProfit')}
                  </div>
                  <p className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                    ${fmt2(data.netProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t('profitability.afterAllCosts')}</p>
                </CardContent>
              </Card>
            </div>

            {/* Cash Discrepancy + Overhead Status */}
            <div className="flex items-center gap-2 flex-wrap">
              {data.cashDiscrepancy > 0 && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  {t('profitability.cashDiscrepancy', { count: data.cashDiscrepancy })}
                </Badge>
              )}
              {isOverheadPosted && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {t('profitability.overheadPosted', { count: overheadCount })}
                </Badge>
              )}
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">{t('profitability.expenseBreakdown')}</CardTitle></CardHeader>
                <CardContent><ExpenseBreakdownChart expensesByCategory={data.expensesByCategory} /></CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{t('profitability.operatingExpensesLedger')}</CardTitle>
                  <div className="flex items-center gap-2">
                    {isAdmin && !isOverheadPosted && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" disabled={generateOverhead.isPending}>
                            {generateOverhead.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                            {t('profitability.generateOverhead')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('profitability.generateOverheadTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('profitability.generateOverheadDesc', { month: monthName, year })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleGenerateOverhead}>{t('common.confirm')}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {canManageExpenses && (
                      <Button size="sm" onClick={() => setShowAddExpense(true)}>
                        <Plus className="h-4 w-4 mr-1" /> {t('profitability.addExpense')}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {data.expensesList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t('profitability.noExpenses', { month: monthName, year })}
                    </p>
                  ) : (
                    <div className="overflow-auto max-h-[350px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('profitability.date')}</TableHead>
                            <TableHead>{t('profitability.category')}</TableHead>
                            <TableHead>{t('profitability.description')}</TableHead>
                            <TableHead className="text-right">{t('profitability.amount')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.expensesList.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="text-sm">
                                {format(new Date(e.expense_date + 'T00:00:00'), 'MMM d')}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] || e.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                                {e.description || '—'}
                              </TableCell>
                              <TableCell className="text-right font-medium text-sm">
                                ${fmt2(Number(e.amount))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <AddExpenseDialog
        open={showAddExpense}
        onOpenChange={setShowAddExpense}
        onSubmit={async (expense) => { await addExpense.mutateAsync(expense); }}
        defaultDate={defaultExpenseDate}
      />
    </AppLayout>
  );
}