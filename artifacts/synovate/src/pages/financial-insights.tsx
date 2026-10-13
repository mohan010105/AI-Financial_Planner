import { useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  CircleHelp,
  Clock,
  Coins,
  Download,
  Info,
  Layers,
  PieChart as PieChartIcon,
  RefreshCw,
  Repeat,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'wouter';
import {
  getGetAnalyticsCategoryBreakdownQueryKey,
  getGetAnalyticsFinancialHealthQueryKey,
  getGetAnalyticsMonthlyTrendQueryKey,
  getGetAnalyticsRecurringSummaryQueryKey,
  getGetAnalyticsSummaryQueryKey,
  useGetAnalyticsCategoryBreakdown,
  useGetAnalyticsFinancialHealth,
  useGetAnalyticsMonthlyTrend,
  useGetAnalyticsRecurringSummary,
  useGetAnalyticsSummary,
} from '@workspace/api-client-react';
import { Button, Card, Empty, ErrorState, Loading } from '@/components/ui-kit';

const COLORS = [
  '#0F9F75',
  '#2563EB',
  '#0284C7',
  '#D97706',
  '#7C3AED',
  '#059669',
  '#DB2777',
  '#64748B',
  '#10B981',
  '#F59E0B',
];

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #E5EAF0',
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(20,32,51,0.08)',
  fontFamily: 'Inter, sans-serif',
  fontSize: 12,
  padding: '10px 14px',
};

const formatCurrency = (value: number, currencyCode: string | null) => {
  if (!currencyCode) return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }).format(value);
  } catch {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  }
};

const monthLabel = (value: string) => {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

export default function FinancialInsightsPage() {
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');
  const [activeCategoryTab, setActiveCategoryTab] = useState<'current' | 'allTime'>('current');

  const summary = useGetAnalyticsSummary({ query: { queryKey: getGetAnalyticsSummaryQueryKey() } });
  const monthlyTrend = useGetAnalyticsMonthlyTrend({ query: { queryKey: getGetAnalyticsMonthlyTrendQueryKey() } });
  const categories = useGetAnalyticsCategoryBreakdown({ query: { queryKey: getGetAnalyticsCategoryBreakdownQueryKey() } });
  const recurring = useGetAnalyticsRecurringSummary({ query: { queryKey: getGetAnalyticsRecurringSummaryQueryKey() } });
  const health = useGetAnalyticsFinancialHealth({ query: { queryKey: getGetAnalyticsFinancialHealthQueryKey() } });

  const isLoading = summary.isLoading || monthlyTrend.isLoading || categories.isLoading || health.isLoading;
  const isError = summary.isError || monthlyTrend.isError || categories.isError || health.isError;

  if (isLoading) {
    return (
      <div className="page-content page-enter">
        <div className="page-intro">
          <div>
            <div className="eyebrow">
              <span>FINANCIAL INTELLIGENCE WORKSPACE</span>
              <span className="eyebrow-line" />
            </div>
            <h1>Financial <em>Insights</em></h1>
            <p>Comprehensive cash-flow analysis and deterministic engine metrics.</p>
          </div>
        </div>
        <Loading label="Computing deterministic financial intelligence metrics…" />
      </div>
    );
  }

  if (isError || !summary.data) {
    return (
      <div className="page-content page-enter">
        <div className="page-intro">
          <div>
            <div className="eyebrow">
              <span>FINANCIAL INTELLIGENCE WORKSPACE</span>
              <span className="eyebrow-line" />
            </div>
            <h1>Financial <em>Insights</em></h1>
            <p>Comprehensive cash-flow analysis and deterministic engine metrics.</p>
          </div>
        </div>
        <ErrorState
          error={summary.error || monthlyTrend.error || categories.error || recurring.error || health.error}
          title="We couldn’t load financial insights."
          description="A problem occurred while computing your financial analytics. Please try again."
          onRetry={() => {
            void summary.refetch();
            void monthlyTrend.refetch();
            void categories.refetch();
            void recurring.refetch();
            void health.refetch();
          }}
        />
      </div>
    );
  }

  const currencyCode = summary.data.currencyCode ?? null;
  const curr = (val: number) => formatCurrency(val, currencyCode);

  const months = monthlyTrend.data?.months ?? [];
  const currentCats = categories.data?.currentMonthCategories ?? [];
  const allTimeCats = categories.data?.allTimeCategories ?? [];
  const displayedCategories = activeCategoryTab === 'current' ? currentCats : allTimeCats;
  const indicators = health.data?.indicators ?? [];
  const healthMetrics = health.data?.metrics;

  const currentMonthSavings = summary.data.currentMonthSavings;
  const isSurplusPositive = currentMonthSavings >= 0;

  return (
    <div className="page-content page-enter" data-testid="page-financial-insights">
      {/* Page Header */}
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <span>DETERMINISTIC ANALYTICS ENGINE · REAL-TIME VERIFIED</span>
            <span className="eyebrow-line" />
          </div>
          <h1>Financial <em>Insights & Intelligence</em></h1>
          <p>
            Audit-grade cash-flow tracking, spending distribution, and safety net runway calculated directly from your ledger.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-outline btn-md"
            onClick={() => window.print()}
            data-testid="button-export-insights"
          >
            <Download size={15} /> Export Report
          </button>
        </div>
      </div>

      {/* Engine Status Banner */}
      <div className="demo-notice" style={{ background: '#E9F7F0', borderColor: '#d1fae5', color: '#065f46' }}>
        <span className="demo-dot" style={{ background: '#0F9F75' }} />
        <span>
          <strong>SYNOVATE Financial Intelligence</strong> · Calculations verified by backend rules. Zero AI hallucinations in financial math.
        </span>
        <span className="notice-phase" style={{ color: '#047857' }}>
          CURRENCY: {currencyCode || 'DEFAULT'} · AS OF {summary.data.asOfDate}
        </span>
      </div>

      {/* Top 4 Financial Position Metrics */}
      <section className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        <Card className="metric-card" style={{ borderLeft: '4px solid #0F9F75' }}>
          <div className="metric-top">
            <span>Monthly Cash Flow</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: isSurplusPositive ? '#0F9F75' : '#EF4444' }}>
              {isSurplusPositive ? 'SURPLUS' : 'DEFICIT'}
            </span>
          </div>
          <strong className="metric-value tabular-nums" style={{ color: isSurplusPositive ? '#0F9F75' : '#DC2626' }}>
            {isSurplusPositive ? '+' : ''}{curr(currentMonthSavings)}
          </strong>
          <div className="metric-foot">
            {curr(summary.data.currentMonthIncome)} in · {curr(summary.data.currentMonthExpenses)} out
          </div>
        </Card>

        <Card className="metric-card" style={{ borderLeft: '4px solid #2563EB' }}>
          <div className="metric-top">
            <span>Current Savings Rate</span>
            <span style={{ fontSize: 11, color: '#64748B' }}>Target: 20%+</span>
          </div>
          <strong className="metric-value tabular-nums" style={{ color: '#142033' }}>
            {summary.data.currentMonthSavingsRate}%
          </strong>
          <div className="metric-foot">
            All-time average: {summary.data.allTimeSavingsRate}%
          </div>
        </Card>

        <Card className="metric-card" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div className="metric-top">
            <span>Recurring Commitments</span>
            <span style={{ fontSize: 11, color: '#64748B' }}>{recurring.data?.recurringItemCount ?? 0} active</span>
          </div>
          <strong className="metric-value tabular-nums" style={{ color: '#142033' }}>
            {curr(recurring.data?.totalRecurringMonthlyExpenses ?? 0)}
          </strong>
          <div className="metric-foot">
            {recurring.data?.recurringExpensesPercentage ?? 0}% of monthly expenses
          </div>
        </Card>

        <Card className="metric-card" style={{ borderLeft: '4px solid #D97706' }}>
          <div className="metric-top">
            <span>Emergency Runway</span>
            <span style={{ fontSize: 11, color: '#64748B' }}>Buffer</span>
          </div>
          <strong className="metric-value tabular-nums" style={{ color: '#142033' }}>
            {healthMetrics?.emergencyFundCoverageMonths != null
              ? `${healthMetrics.emergencyFundCoverageMonths.toFixed(1)} mo`
              : 'N/A'}
          </strong>
          <div className="metric-foot">
            {healthMetrics?.emergencyFundAmount ? `${curr(healthMetrics.emergencyFundAmount)} reserved` : 'Set profile emergency fund'}
          </div>
        </Card>
      </section>

      {/* Main Cash Flow Trend Section */}
      <section style={{ margin: '24px 0' }}>
        <Card className="chart-card" style={{ padding: '22px 24px' }}>
          <div className="chart-heading" style={{ alignItems: 'center' }}>
            <div>
              <span className="chart-kicker">CASH FLOW TREND (6 MONTHS)</span>
              <h2 style={{ fontSize: 18, color: '#142033' }}>Income vs. Expense Trajectory</h2>
              <p style={{ color: '#64748B' }}>
                Compare monthly inflows with total outflows to visualize net cash accumulation over time.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn btn-sm ${chartType === 'bar' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setChartType('bar')}
              >
                Bar Chart
              </button>
              <button
                className={`btn btn-sm ${chartType === 'line' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setChartType('line')}
              >
                Line Chart
              </button>
            </div>
          </div>

          <div className="chart-legend-inline" style={{ marginTop: 12, marginBottom: 12 }}>
            <span><i className="legend-swatch" style={{ background: '#0F9F75' }} /> Inflow (Income)</span>
            <span><i className="legend-swatch" style={{ background: '#94a3b8' }} /> Outflow (Expenses)</span>
            <span><i className="legend-swatch" style={{ background: '#2563EB' }} /> Net Savings</span>
          </div>

          {months.length > 0 ? (
            <div style={{ width: '100%', height: 280, marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={months} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#E5EAF0" strokeDasharray="3 4" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={monthLabel}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748B', fontSize: 10 }}
                      tickFormatter={(v) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(v)}
                    />
                    <Tooltip
                      formatter={(value, name) => [curr(Number(value)), name]}
                      labelFormatter={(label) => monthLabel(String(label))}
                      contentStyle={tooltipStyle}
                    />
                    <Bar dataKey="income" name="Income" fill="#0F9F75" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="expenses" name="Expenses" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                ) : (
                  <LineChart data={months} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#E5EAF0" strokeDasharray="3 4" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={monthLabel}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748B', fontSize: 10 }}
                      tickFormatter={(v) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(v)}
                    />
                    <Tooltip
                      formatter={(value, name) => [curr(Number(value)), name]}
                      labelFormatter={(label) => monthLabel(String(label))}
                      contentStyle={tooltipStyle}
                    />
                    <Line type="monotone" dataKey="income" name="Income" stroke="#0F9F75" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#94a3b8" strokeWidth={2.2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="savings" name="Net Savings" stroke="#2563EB" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 10px' }}>
              <TrendingUp size={24} style={{ color: '#0F9F75' }} />
              <h3>No monthly history yet</h3>
              <p>Record transactions across multiple months to unlock automated trend analytics.</p>
            </div>
          )}
        </Card>
      </section>

      {/* Category Breakdown & Recurring Expenses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ marginBottom: 24 }}>
        {/* Category Breakdown (7 cols) */}
        <div className="lg:col-span-7">
          <Card style={{ padding: 22, height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <span className="chart-kicker">EXPENDITURE DISTRIBUTION</span>
                <h2 style={{ fontSize: 17, color: '#142033', margin: '2px 0 0' }}>Category Breakdown</h2>
              </div>
              <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', padding: 3, borderRadius: 8 }}>
                <button
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: 0,
                    background: activeCategoryTab === 'current' ? '#ffffff' : 'transparent',
                    color: activeCategoryTab === 'current' ? '#142033' : '#64748B',
                    boxShadow: activeCategoryTab === 'current' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveCategoryTab('current')}
                >
                  This Month
                </button>
                <button
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: 0,
                    background: activeCategoryTab === 'allTime' ? '#ffffff' : 'transparent',
                    color: activeCategoryTab === 'allTime' ? '#142033' : '#64748B',
                    boxShadow: activeCategoryTab === 'allTime' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveCategoryTab('allTime')}
                >
                  All Time
                </button>
              </div>
            </div>

            {displayedCategories.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(220px, 1.2fr)', gap: 16, alignItems: 'center' }}>
                <div style={{ width: '100%', height: 210, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={displayedCategories}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="86%"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {displayedCategories.map((entry, index) => (
                          <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => [
                          `${curr(Number(value))} (${props.payload?.percentage ?? 0}%)`,
                          name,
                        ]}
                        contentStyle={tooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <span style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total</span>
                    <strong style={{ fontSize: 16, color: '#142033', fontWeight: 700 }}>
                      {curr(
                        activeCategoryTab === 'current'
                          ? categories.data?.totalCurrentMonthExpenses ?? 0
                          : categories.data?.totalAllTimeExpenses ?? 0,
                      )}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {displayedCategories.slice(0, 6).map((item, index) => (
                    <div key={item.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#142033', fontWeight: 500 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 2,
                              background: COLORS[index % COLORS.length],
                            }}
                          />
                          {item.category}
                        </span>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>
                          {curr(item.amount)} ({item.percentage}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 5, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${item.percentage}%`,
                            height: '100%',
                            background: COLORS[index % COLORS.length],
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '30px 10px' }}>
                <PieChartIcon size={20} style={{ color: '#0F9F75' }} />
                <h3>No expense categories</h3>
                <p>Categorized spending will automatically build this breakdown.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Recurring Expense Commitments (5 cols) */}
        <div className="lg:col-span-5">
          <Card style={{ padding: 22, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <span className="chart-kicker">FIXED OUTFLOW ANALYSIS</span>
                  <h2 style={{ fontSize: 17, color: '#142033', margin: '2px 0 0' }}>Recurring Commitments</h2>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: '#E9F7F0',
                    color: '#0F9F75',
                    fontWeight: 700,
                  }}
                >
                  {recurring.data?.recurringExpensesPercentage ?? 0}% OF BUDGET
                </span>
              </div>

              <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, margin: '0 0 16px' }}>
                Subscriptions, rent, utility bills, and insurance that repeat every month without manual input.
              </p>

              {recurring.data?.items && recurring.data.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                  {recurring.data.items.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: '#F8FAFC',
                        border: '1px solid #E5EAF0',
                        borderRadius: 10,
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 12, color: '#142033', display: 'block' }}>
                          {item.description || item.category}
                        </strong>
                        <span style={{ fontSize: 10, color: '#64748B' }}>
                          {item.category} · Next bill projected
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: item.type === 'EXPENSE' ? '#DC2626' : '#0F9F75',
                        }}
                        className="tabular-nums"
                      >
                        {item.type === 'EXPENSE' ? '−' : '+'}{curr(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    background: '#F8FAFC',
                    borderRadius: 10,
                    border: '1px dashed #CBD5E1',
                  }}
                >
                  <Repeat size={20} style={{ margin: '0 auto 6px', color: '#64748B' }} />
                  <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                    No recurring expenses marked. Check "Mark as recurring" when adding bills to track them here.
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: 18, borderTop: '1px solid #E5EAF0', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B' }}>
                <span>Total Monthly Fixed Outflow</span>
                <strong style={{ color: '#142033', fontSize: 13 }} className="tabular-nums">
                  {curr(recurring.data?.totalRecurringMonthlyExpenses ?? 0)}
                </strong>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Financial Health & Indicator Workspace */}
      <section style={{ margin: '24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span className="chart-kicker">GOVERNANCE & RESILIENCE</span>
            <h2 style={{ fontSize: 18, color: '#142033', margin: '2px 0 0' }}>Financial Health Indicators</h2>
          </div>
          <Link
            href="/profile"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#0F9F75',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Update Financial Profile →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {indicators.map((ind) => {
            const isGood = ind.status === 'HEALTHY';
            const isWarning = ind.status === 'ATTENTION';
            const statusColor = isGood ? '#0F9F75' : isWarning ? '#D97706' : '#64748B';
            const statusBg = isGood ? '#E9F7F0' : isWarning ? '#FEF3C7' : '#F1F5F9';

            return (
              <Card
                key={ind.id}
                style={{
                  padding: 18,
                  borderLeft: `4px solid ${statusColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '.04em' }}>
                      {ind.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 7px',
                        borderRadius: 6,
                        fontWeight: 700,
                        color: statusColor,
                        background: statusBg,
                      }}
                    >
                      {ind.status}
                    </span>
                  </div>
                  <strong style={{ fontSize: 20, color: '#142033', display: 'block', margin: '4px 0 8px' }} className="tabular-nums">
                    {ind.valueText}
                  </strong>
                  <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                    {ind.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Explanatory Footnote */}
      <div className="dashboard-footnote" style={{ borderTop: '1px solid #E5EAF0', paddingTop: 14 }}>
        <CircleHelp size={15} style={{ color: '#0F9F75' }} />
        <span style={{ color: '#64748B', fontSize: 11, lineHeight: 1.5 }}>
          All analytics are deterministically computed from your stored ledger. SYNOVATE does not perform estimations using Large Language Models for accounting formulas.
        </span>
      </div>
    </div>
  );
}
