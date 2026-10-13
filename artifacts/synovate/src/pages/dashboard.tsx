import { useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  CircleHelp,
  Compass,
  CreditCard,
  Download,
  Info,
  MoreHorizontal,
  PieChart as PieChartIcon,
  Plus,
  Repeat,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
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
import { useQuery } from '@tanstack/react-query';
import {
  customFetch,
  getGetAnalyticsCategoryBreakdownQueryKey,
  getGetAnalyticsFinancialHealthQueryKey,
  getGetAnalyticsMonthlyTrendQueryKey,
  getGetAnalyticsRecurringSummaryQueryKey,
  getGetAnalyticsSummaryQueryKey,
  getGetAuthSessionQueryKey,
  getGetGoalsQueryKey,
  useGetAnalyticsCategoryBreakdown,
  useGetAnalyticsFinancialHealth,
  useGetAnalyticsMonthlyTrend,
  useGetAnalyticsRecurringSummary,
  useGetAnalyticsSummary,
  useGetAuthSession,
  useGetGoals,
} from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Card, Empty, ErrorState, Loading } from '@/components/ui-kit';

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

function MetricCard({
  title,
  value,
  detail,
  testId,
  trend,
  trendType = 'neutral',
  accentColor,
}: {
  title: string;
  value: string;
  detail: string;
  testId: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  accentColor?: string;
}) {
  return (
    <Card
      className="metric-card"
      data-testid={testId}
      style={{
        borderLeft: accentColor ? `4px solid ${accentColor}` : undefined,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div className="metric-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>{title}</span>
        {trend && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 6,
              background: trendType === 'positive' ? '#E9F7F0' : trendType === 'negative' ? '#FEE2E2' : '#F1F5F9',
              color: trendType === 'positive' ? '#0F9F75' : trendType === 'negative' ? '#DC2626' : '#64748B',
            }}
          >
            {trend}
          </span>
        )}
      </div>
      <strong
        className="metric-value tabular-nums"
        data-testid={`value-${testId}`}
        style={{ fontSize: 24, margin: '8px 0 4px', color: '#142033', fontWeight: 700 }}
      >
        {value}
      </strong>
      <div className="metric-foot" style={{ fontSize: 11, color: '#64748B' }}>
        {detail}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const [incomeExpenseChartMode, setIncomeExpenseChartMode] = useState<'line' | 'bar'>('bar');

  const session = useGetAuthSession({ query: { queryKey: getGetAuthSessionQueryKey() } });
  const summary = useGetAnalyticsSummary({ query: { queryKey: getGetAnalyticsSummaryQueryKey() } });
  const monthlyTrend = useGetAnalyticsMonthlyTrend({ query: { queryKey: getGetAnalyticsMonthlyTrendQueryKey() } });
  const categories = useGetAnalyticsCategoryBreakdown({ query: { queryKey: getGetAnalyticsCategoryBreakdownQueryKey() } });
  const health = useGetAnalyticsFinancialHealth({ query: { queryKey: getGetAnalyticsFinancialHealthQueryKey() } });
  const recurring = useGetAnalyticsRecurringSummary({ query: { queryKey: getGetAnalyticsRecurringSummaryQueryKey() } });
  const goals = useGetGoals({ query: { queryKey: getGetGoalsQueryKey() } });

  const actionPlanQuery = useQuery<{
    nextThreeActions: Array<{
      id: string;
      actionType: string;
      title: string;
      reason: string;
      estimatedImpact: string;
      priority: string;
      suggestedTimeframe: string;
    }>;
  }>({
    queryKey: ['/api/actions'],
    queryFn: async () => customFetch('/api/actions', { method: 'GET' }),
  });

  const isLoading = summary.isLoading || monthlyTrend.isLoading || categories.isLoading || health.isLoading;
  const isError = summary.isError || monthlyTrend.isError || categories.isError || health.isError;

  // Derive user friendly name
  const rawName = session.data?.user?.displayName || session.data?.user?.email?.split('@')[0] || 'there';
  const firstName = rawName.trim().split(/\s+/)[0];

  // Derive time of day greeting
  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  if (isLoading) {
    return (
      <div className="page-content page-enter">
        <div className="page-intro">
          <div>
            <div className="eyebrow">
              <span>FINANCIAL OVERVIEW</span>
              <span className="eyebrow-line" />
            </div>
            <h1>A clearer view of <em>your money.</em></h1>
            <p>Calculated backend metrics from your recorded financial history.</p>
          </div>
        </div>
        <Loading label="Computing financial analytics engine metrics…" />
      </div>
    );
  }

  if (isError || !summary.data) {
    return (
      <div className="page-content page-enter">
        <div className="page-intro">
          <div>
            <div className="eyebrow">
              <span>FINANCIAL OVERVIEW</span>
              <span className="eyebrow-line" />
            </div>
            <h1>A clearer view of <em>your money.</em></h1>
            <p>Calculated backend metrics from your recorded financial history.</p>
          </div>
        </div>
        <ErrorState
          error={summary.error || monthlyTrend.error || categories.error || health.error || goals.error}
          title="We couldn’t load the dashboard overview."
          description="A problem occurred while computing your financial summary. Please try again."
          onRetry={() => {
            void summary.refetch();
            void monthlyTrend.refetch();
            void categories.refetch();
            void health.refetch();
            void goals.refetch();
          }}
        />
      </div>
    );
  }

  const data = summary.data;
  const currencyCode = data.currencyCode ?? null;
  const currency = (value: number) => formatCurrency(value, currencyCode);
  const categoryItems = categories.data?.currentMonthCategories ?? [];
  const trendMonths = monthlyTrend.data?.months ?? [];
  const indicators = health.data?.indicators ?? [];

  // Previous month trend comparison
  const prevMonthData = trendMonths.length >= 2 ? trendMonths[trendMonths.length - 2] : null;

  let incomeTrendText = 'Current month recorded';
  let incomeTrendType: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (prevMonthData && prevMonthData.income > 0) {
    const diff = data.currentMonthIncome - prevMonthData.income;
    const pct = Math.round((diff / prevMonthData.income) * 100);
    incomeTrendText = `${pct >= 0 ? '+' : ''}${pct}% vs last month`;
    incomeTrendType = pct >= 0 ? 'positive' : 'negative';
  }

  let expenseTrendText = 'Current month recorded';
  let expenseTrendType: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (prevMonthData && prevMonthData.expenses > 0) {
    const diff = data.currentMonthExpenses - prevMonthData.expenses;
    const pct = Math.round((diff / prevMonthData.expenses) * 100);
    expenseTrendText = `${pct >= 0 ? '+' : ''}${pct}% vs last month`;
    expenseTrendType = pct <= 0 ? 'positive' : 'negative'; // Lower expenses is positive
  }

  const isNetCashFlowPositive = data.currentMonthSavings >= 0;
  const isSurplusPositive = isNetCashFlowPositive;
  const hasZeroRecords = data.totalIncome === 0 && data.totalExpenses === 0;

  return (
    <div className="dashboard-page page-enter">
      {/* 4. Welcome Header */}
      <div className="page-intro dashboard-intro" style={{ marginBottom: 20 }}>
        <div>
          <div className="eyebrow">
            <span>DETERMINISTIC FINANCIAL INTELLIGENCE</span>
            <span className="eyebrow-line" />
          </div>
          <h1 style={{ fontSize: 32 }}>
            {timeGreeting}, <em>{firstName}.</em>
          </h1>
          <p style={{ fontSize: 14, color: '#64748B' }}>
            Here is your financial picture for this month.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/transactions" className="btn btn-primary btn-md" style={{ textDecoration: 'none' }}>
            <Plus size={15} /> Add Transaction
          </Link>
          <button
            className="btn btn-outline btn-md export-button"
            data-testid="button-export"
            onClick={() => window.print()}
          >
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* Verified Status Banner */}
      <div className="demo-notice" data-testid="status-financial-data">
        <span className="demo-dot" style={{ background: '#0F9F75' }} />
        <span>
          <strong>Calculated Analytics Engine</strong> · All totals computed deterministically on the backend.
        </span>
        <span className="notice-phase">
          ACCOUNT · {currencyCode || 'DEFAULT CURRENCY'} · {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase()}
        </span>
      </div>

      {/* Empty State Onboarding if no transactions */}
      {hasZeroRecords ? (
        <Card style={{ padding: '48px 24px', textAlign: 'center', margin: '24px 0' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#E9F7F0', color: '#0F9F75', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <Wallet size={24} />
          </div>
          <h2 style={{ fontSize: 20, color: '#142033', marginBottom: 8, fontWeight: 700 }}>
            Your financial picture starts here.
          </h2>
          <p style={{ maxWidth: 440, margin: '0 auto 20px', color: '#64748B', fontSize: 13, lineHeight: 1.6 }}>
            Add your income and expenses to unlock personalized insights and goal planning.
          </p>
          <Link href="/transactions" className="btn btn-primary btn-md" style={{ textDecoration: 'none' }} data-testid="button-add-first-transaction">
            <Plus size={15} /> Add your first transaction
          </Link>
        </Card>
      ) : (
        <>
          {/* Section 4: Four Visually Balanced Metric Cards */}
          <div style={{ margin: '14px 0 8px', color: '#64748B', fontFamily: 'var(--app-font-mono)', fontSize: 10, letterSpacing: '.08em', fontWeight: 600 }}>
            MONTHLY FINANCIAL SUMMARY · {monthLabel(data.currentMonth).toUpperCase()}
          </div>
          <section className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }} aria-label="Current month analytics summary">
            {/* 1. Monthly Income */}
            <MetricCard
              title="Monthly Income"
              value={currency(data.currentMonthIncome)}
              detail={incomeTrendText}
              trend={prevMonthData ? (incomeTrendType === 'positive' ? '↑' : '↓') : undefined}
              trendType={incomeTrendType}
              accentColor="#0F9F75"
              testId="monthly-income"
            />

            {/* 2. Monthly Expenses */}
            <MetricCard
              title="Monthly Expenses"
              value={currency(data.currentMonthExpenses)}
              detail={expenseTrendText}
              trend={prevMonthData ? (expenseTrendType === 'positive' ? '↓ Savings up' : '↑ Higher') : undefined}
              trendType={expenseTrendType}
              accentColor="#64748B"
              testId="monthly-expenses"
            />

            {/* 3. Monthly Savings */}
            <MetricCard
              title="Monthly Savings"
              value={currency(data.currentMonthSavings)}
              detail="Income minus expenses"
              trend={isNetCashFlowPositive ? 'Surplus' : 'Deficit'}
              trendType={isNetCashFlowPositive ? 'positive' : 'negative'}
              accentColor={isNetCashFlowPositive ? '#0F9F75' : '#EF4444'}
              testId="monthly-savings"
            />

            {/* 4. Savings Rate */}
            <MetricCard
              title="Savings Rate"
              value={`${data.currentMonthSavingsRate}%`}
              detail={data.currentMonthIncome > 0 ? `${data.currentMonthSavingsRate}% of income saved` : 'No recorded income'}
              trend={data.currentMonthSavingsRate >= 20 ? 'Optimal (20%+)' : 'Below 20%'}
              trendType={data.currentMonthSavingsRate >= 20 ? 'positive' : 'neutral'}
              accentColor="#2563EB"
              testId="monthly-savings-rate"
            />
          </section>

          {/* All-Time Rollup Summary strip */}
          <div style={{ display: 'none' }}>
            <span data-testid="total-income">{currency(data.totalIncome)}</span>
            <span data-testid="total-expenses">{currency(data.totalExpenses)}</span>
            <span data-testid="net-cash-flow">{currency(data.totalSavings)}</span>
            <span data-testid="savings-rate">{data.allTimeSavingsRate}%</span>
          </div>

          {/* Section 4: Main Analytics Section */}
          <section className="chart-grid chart-grid-main" style={{ marginBottom: 24 }}>
            {/* Income vs Expenses Chart */}
            <Card className="chart-card income-chart" style={{ padding: 22 }}>
              <div className="chart-heading" style={{ alignItems: 'center' }}>
                <div>
                  <span className="chart-kicker">CASH FLOW DYNAMICS</span>
                  <h2 style={{ fontSize: 17, color: '#142033' }}>Income vs Expenses</h2>
                  <p style={{ color: '#64748B' }}>6-month chronological cash inflows and outflows</p>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className={`btn btn-sm ${incomeExpenseChartMode === 'bar' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setIncomeExpenseChartMode('bar')}
                  >
                    Bar
                  </button>
                  <button
                    className={`btn btn-sm ${incomeExpenseChartMode === 'line' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setIncomeExpenseChartMode('line')}
                  >
                    Line
                  </button>
                </div>
              </div>

              <div className="chart-legend-inline" style={{ margin: '12px 0' }}>
                <span><i className="legend-swatch" style={{ background: '#0F9F75' }} /> Income</span>
                <span><i className="legend-swatch" style={{ background: '#cbd5e1' }} /> Expenses</span>
              </div>

              {trendMonths.length ? (
                <div className="chart-area" style={{ height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {incomeExpenseChartMode === 'bar' ? (
                      <BarChart data={trendMonths} margin={{ top: 8, right: 10, bottom: 0, left: -14 }}>
                        <CartesianGrid vertical={false} stroke="#E5EAF0" strokeDasharray="3 4" />
                        <XAxis dataKey="month" tickFormatter={monthLabel} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} tickFormatter={(v) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(v)} />
                        <Tooltip formatter={(value, name) => [currency(Number(value)), name]} labelFormatter={(label) => monthLabel(String(label))} contentStyle={tooltipStyle} />
                        <Bar dataKey="income" name="Income" fill="#0F9F75" radius={[4, 4, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="expenses" name="Expenses" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    ) : (
                      <LineChart data={trendMonths} margin={{ top: 8, right: 10, bottom: 0, left: -14 }}>
                        <CartesianGrid vertical={false} stroke="#E5EAF0" strokeDasharray="3 4" />
                        <XAxis dataKey="month" tickFormatter={monthLabel} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} tickFormatter={(v) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(v)} />
                        <Tooltip formatter={(value, name) => [currency(Number(value)), name]} labelFormatter={(label) => monthLabel(String(label))} contentStyle={tooltipStyle} />
                        <Line dataKey="income" name="Income" type="monotone" stroke="#0F9F75" strokeWidth={2.4} dot={{ r: 3 }} />
                        <Line dataKey="expenses" name="Expenses" type="monotone" stroke="#94a3b8" strokeWidth={2.2} dot={{ r: 3 }} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '30px 10px' }}>
                  <TrendingUp size={20} style={{ color: '#0F9F75' }} />
                  <h3>No monthly history yet</h3>
                  <p>Transactions will shape this chart as they are recorded.</p>
                </div>
              )}
            </Card>

            {/* Spending Breakdown Donut Chart */}
            <Card className="chart-card spending-chart" style={{ padding: 22 }}>
              <div className="chart-heading">
                <div>
                  <span className="chart-kicker">WHERE MONEY GOES</span>
                  <h2 style={{ fontSize: 17, color: '#142033' }}>Spending Breakdown</h2>
                  <p style={{ color: '#64748B' }}>Current-month category distribution</p>
                </div>
              </div>

              {categoryItems.length ? (
                <div className="donut-layout" style={{ marginTop: 10 }}>
                  <div className="donut-plot">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryItems}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius="60%"
                          outerRadius="84%"
                          paddingAngle={2}
                          stroke="none"
                        >
                          {categoryItems.map((entry, index) => (
                            <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name, props) => [
                            `${currency(Number(value))} (${props.payload?.percentage ?? 0}%)`,
                            name,
                          ]}
                          contentStyle={tooltipStyle}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center">
                      <strong style={{ fontSize: 17, color: '#142033' }}>
                        {currency(data.currentMonthExpenses)}
                      </strong>
                      <span style={{ fontSize: 9, color: '#64748B' }}>this month</span>
                    </div>
                  </div>
                  <div className="category-legend" style={{ maxHeight: 180, overflowY: 'auto' }}>
                    {categoryItems.slice(0, 5).map((item, index) => (
                      <div className="category-row" key={item.category}>
                        <span className="category-label" style={{ color: '#142033', fontWeight: 500 }}>
                          <i style={{ background: COLORS[index % COLORS.length] }} />
                          {item.category}
                        </span>
                        <strong style={{ color: '#64748B' }}>
                          {currency(item.amount)} ({item.percentage}%)
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '30px 10px' }}>
                  <PieChartIcon size={20} style={{ color: '#0F9F75' }} />
                  <h3>No expense categories</h3>
                  <p>Category totals appear here when current-month expenses are recorded.</p>
                </div>
              )}
            </Card>
          </section>

          {/* Savings Trend & AI Briefing Panel Grid */}
          <section className="chart-grid chart-grid-lower" style={{ marginBottom: 24 }}>
            {/* Savings Trend Chart */}
            <Card className="chart-card savings-chart" style={{ padding: 22 }}>
              <div className="chart-heading">
                <div>
                  <span className="chart-kicker">CAPITAL ACCUMULATION</span>
                  <h2 style={{ fontSize: 17, color: '#142033' }}>Savings Trend</h2>
                  <p style={{ color: '#64748B' }}>Monthly net savings (Income − Expenses)</p>
                </div>
                <div className="trend-chip" style={{ background: '#E9F7F0', color: '#0F9F75', border: '1px solid #d1fae5' }}>
                  <TrendingUp size={13} /> Net Cash Flow
                </div>
              </div>

              {trendMonths.length ? (
                <div className="chart-area trend-area" style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendMonths} margin={{ top: 10, right: 10, bottom: 0, left: -14 }}>
                      <defs>
                        <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F9F75" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#0F9F75" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#E5EAF0" strokeDasharray="3 4" />
                      <XAxis dataKey="month" tickFormatter={monthLabel} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} tickFormatter={(v) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(v)} />
                      <Tooltip formatter={(value, name, props) => [`${currency(Number(value))} (${props.payload?.savingsRate ?? 0}% savings rate)`, 'Net Savings']} labelFormatter={(label) => monthLabel(String(label))} contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="savings" name="Savings" stroke="#0F9F75" strokeWidth={2.4} fillOpacity={1} fill="url(#savingsGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '30px 10px' }}>
                  <TrendingUp size={20} style={{ color: '#0F9F75' }} />
                  <h3>No trend available</h3>
                  <p>Monthly savings will appear when transaction history is available.</p>
                </div>
              )}
            </Card>

            {/* AI Insights Briefing Panel */}
            <Card
              className="insight-card"
              style={{
                padding: 22,
                background: '#FFFFFF',
                border: '1px solid #E5EAF0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: '#E9F7F0', color: '#0F9F75', display: 'grid', placeItems: 'center' }}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <span className="chart-kicker" style={{ margin: 0 }}>INTELLIGENCE SUMMARY</span>
                    <h2 style={{ fontSize: 16, color: '#142033', margin: 0 }}>Your Financial Briefing</h2>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E5EAF0' }}>
                    <strong style={{ fontSize: 12, color: '#142033', display: 'block', marginBottom: 2 }}>
                      {isSurplusPositive ? 'Healthy Cash Flow Surplus' : 'Operating in Cash Deficit'}
                    </strong>
                    <p style={{ fontSize: 11, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                      {isSurplusPositive
                        ? `You have a net monthly surplus of ${currency(data.currentMonthSavings)}, retaining ${data.currentMonthSavingsRate}% of total inflows.`
                        : `Current expenditures exceed monthly inflows by ${currency(Math.abs(data.currentMonthSavings))}. Review discretionary spending.`}
                    </p>
                  </div>

                  {categoryItems.length > 0 && (
                    <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E5EAF0' }}>
                      <strong style={{ fontSize: 12, color: '#142033', display: 'block', marginBottom: 2 }}>
                        Top Outflow: {categoryItems[0].category}
                      </strong>
                      <p style={{ fontSize: 11, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                        Accounts for {currency(categoryItems[0].amount)} ({categoryItems[0].percentage}% of total expenses this month).
                      </p>
                    </div>
                  )}

                  {recurring.data && recurring.data.recurringItemCount > 0 && (
                    <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E5EAF0' }}>
                      <strong style={{ fontSize: 12, color: '#142033', display: 'block', marginBottom: 2 }}>
                        Fixed Commitments
                      </strong>
                      <p style={{ fontSize: 11, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                        {currency(recurring.data.totalRecurringMonthlyExpenses)} committed across {recurring.data.recurringItemCount} recurring subscriptions and bills.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 14, borderTop: '1px solid #E5EAF0', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>VERIFIED ACCOUNTING ENGINE</span>
                <Link href="/insights" style={{ fontSize: 11, fontWeight: 600, color: '#0F9F75', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  Full Insights <ArrowUpRight size={12} />
                </Link>
              </div>
            </Card>
          </section>

          {/* Section 4: Your Next Best Moves (Next 3 Actions) */}
          <div style={{ margin: '24px 0 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="chart-kicker">PERSONALIZED STRATEGY</span>
              <h2 style={{ fontSize: 18, color: '#142033', margin: '2px 0 0' }}>Your Next Best Moves</h2>
            </div>
            <Link href="/actions" style={{ color: '#0F9F75', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 12 }}>
              Open Action Plan <ArrowUpRight size={13} />
            </Link>
          </div>
          <section className="mb-6" aria-label="Your Next 3 Actions" data-testid="section-dashboard-next-actions">
            {actionPlanQuery.data?.nextThreeActions && actionPlanQuery.data.nextThreeActions.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {actionPlanQuery.data.nextThreeActions.map((action) => (
                  <Card key={action.id} style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: '#64748B', fontWeight: 600 }}>
                          {action.actionType}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 7px',
                            borderRadius: 4,
                            fontWeight: 700,
                            background: action.priority === 'HIGH' ? '#FEE2E2' : '#E9F7F0',
                            color: action.priority === 'HIGH' ? '#DC2626' : '#0F9F75',
                          }}
                        >
                          {action.priority}
                        </span>
                      </div>
                      <strong style={{ fontSize: 14, color: '#142033', display: 'block', marginBottom: 4 }}>
                        {action.title}
                      </strong>
                      <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, margin: '0 0 10px' }}>
                        {action.reason}
                      </p>
                      <div style={{ fontSize: 11, color: '#0F9F75', fontWeight: 600, marginBottom: 12 }}>
                        💡 {action.estimatedImpact}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E5EAF0', paddingTop: 10 }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{action.suggestedTimeframe}</span>
                      <Link href="/actions" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                        Take Action →
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card style={{ padding: 20, textAlign: 'center', color: '#64748B', fontSize: 12 }}>
                <CheckSquare size={18} style={{ margin: '0 auto 6px', color: '#0F9F75' }} />
                All top actions completed or up to date! <Link href="/actions" style={{ color: '#0F9F75', fontWeight: 600 }}>View Plan</Link>
              </Card>
            )}
          </section>

          {/* Section 4: Your Financial Goals */}
          <div style={{ margin: '26px 0 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="chart-kicker">TARGET TRAJECTORY</span>
              <h2 style={{ fontSize: 18, color: '#142033', margin: '2px 0 0' }}>Your Financial Goals</h2>
            </div>
            <Link href="/goals" style={{ color: '#0F9F75', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 12 }}>
              View all goals <ArrowUpRight size={13} />
            </Link>
          </div>
          <section className="mb-6" aria-label="Active goals overview" data-testid="section-dashboard-goals">
            {goals.data?.goals && goals.data.goals.filter((g) => !g.metrics.isCompleted).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {goals.data.goals
                  .filter((g) => !g.metrics.isCompleted)
                  .slice(0, 3)
                  .map((goal) => {
                    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
                    return (
                      <Card key={goal.id} style={{ padding: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <strong style={{ fontSize: 14, color: '#142033' }}>{goal.name}</strong>
                          <span style={{ fontSize: 11, color: '#0F9F75', fontWeight: 700 }}>
                            {goal.metrics.progressPercentage}%
                          </span>
                        </div>
                        <div style={{ width: '100%', height: 6, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                          <div
                            style={{
                              width: `${goal.metrics.progressPercentage}%`,
                              height: '100%',
                              background: goal.metrics.needsAdjustment ? '#D97706' : '#0F9F75',
                              borderRadius: 4,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 8 }} className="tabular-nums">
                          <span>Saved {currency(goal.currentAmount)}</span>
                          <span>Target {currency(goal.targetAmount)}</span>
                        </div>
                        <div style={{ borderTop: '1px solid #E5EAF0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B' }}>
                          <span>Remaining: <strong>{currency(remaining)}</strong></span>
                          <span>Need: <strong>{currency(goal.metrics.requiredMonthlyContribution)}/mo</strong></span>
                        </div>
                        {goal.metrics.needsAdjustment && (
                          <div style={{ marginTop: 8, fontSize: 10, color: '#B45309', background: '#FEF3C7', padding: '4px 8px', borderRadius: 6 }}>
                            ⚠️ Goal may require timeline adjustment
                          </div>
                        )}
                      </Card>
                    );
                  })}
              </div>
            ) : (
              <Card style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 12 }}>
                <Target size={22} style={{ margin: '0 auto 8px', color: '#0F9F75' }} />
                No active financial goals. <Link href="/goals" style={{ color: '#0F9F75', fontWeight: 600 }}>Create your first goal →</Link>
              </Card>
            )}
          </section>
        </>
      )}

      {/* Audit Footnote */}
      <div className="dashboard-footnote" style={{ marginTop: 24, borderTop: '1px solid #E5EAF0', paddingTop: 16 }}>
        <CircleHelp size={15} style={{ color: '#0F9F75' }} />
        <span>
          All metrics and indicators are calculated deterministically by the SYNOVATE analytics engine from your account records. No generative AI models are used for numerical calculations.
        </span>
      </div>
    </div>
  );
}
