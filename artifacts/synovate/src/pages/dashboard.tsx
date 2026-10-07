import { CircleHelp, Download, MoreHorizontal, TrendingUp } from 'lucide-react';
import { Cell, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getGetTransactionSummaryQueryKey, useGetTransactionSummary } from '@workspace/api-client-react';
import { Card, ErrorState, Loading } from '@/components/ui-kit';

const COLORS = ['#307b70', '#719b88', '#9eb7a6', '#c4a36b', '#7a9da0', '#657f76', '#b68e7b', '#9fabb0'];
const tooltipStyle = { background: '#fff', border: '1px solid #e6ebe6', borderRadius: 10, boxShadow: '0 8px 22px rgba(20,50,55,.08)', fontFamily: 'DM Sans', fontSize: 12 };
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

function MetricCard({ title, value, detail, testId }: { title: string; value: string; detail: string; testId: string }) {
  return <Card className="metric-card" data-testid={testId}><div className="metric-top"><span>{title}</span><span className="metric-more icon-button" aria-hidden="true"><CircleHelp size={15} /></span></div><strong className="metric-value" data-testid={`value-${testId}`}>{value}</strong><div className="metric-foot">{detail}</div></Card>;
}

export default function DashboardPage() {
  const summary = useGetTransactionSummary({ query: { queryKey: getGetTransactionSummaryQueryKey() } });
  if (summary.isLoading) return <div className="dashboard-page"><div className="page-intro"><div><div className="eyebrow">YOUR FINANCIAL OVERVIEW <span className="eyebrow-line" /></div><h1>A clearer view of <em>your money.</em></h1><p>A considered overview of your finances, all in one place.</p></div></div><Loading label="Loading account summary" /></div>;
  if (summary.isError || !summary.data) return <div className="dashboard-page"><div className="page-intro"><div><div className="eyebrow">YOUR FINANCIAL OVERVIEW <span className="eyebrow-line" /></div><h1>A clearer view of <em>your money.</em></h1><p>A considered overview of your finances, all in one place.</p></div></div><ErrorState onRetry={() => { void summary.refetch(); }} /></div>;
  const data = summary.data;
  const currency = (value: number) => formatCurrency(value, data.currencyCode);
  const categories = data.currentMonthExpenseByCategory;
  return <div className="dashboard-page page-enter">
    <style>{`.dashboard-summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:767px){.dashboard-summary-grid{grid-template-columns:1fr}}`}</style>
    <div className="page-intro dashboard-intro"><div><div className="eyebrow">AS OF {new Date(`${data.asOfDate.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()} <span className="eyebrow-line" /></div><h1>A clearer view of <em>your money.</em></h1><p>A considered overview of your finances, all in one place.</p></div><button className="btn btn-outline btn-md export-button" data-testid="button-export" onClick={() => window.print()}><Download size={16} /> Export view</button></div>
     <div className="demo-notice" data-testid="status-financial-data"><span className="demo-dot" /><span><strong>Your account data</strong> · Totals reflect recorded income and expenses</span><span className="notice-phase">PRIVATE · {data.currencyCode || 'NO CURRENCY SET'}</span></div>
    <div style={{ margin: '3px 0 8px', color: '#7b8983', fontFamily: 'var(--app-font-mono)', fontSize: 9, letterSpacing: '.08em' }}>ALL TIME</div>
    <section className="metrics-grid dashboard-summary-grid" aria-label="All-time transaction summary">
      <MetricCard title="Total income" value={currency(data.totalIncome)} detail="Recorded income" testId="total-income" />
      <MetricCard title="Total expenses" value={currency(data.totalExpenses)} detail="Recorded expenses" testId="total-expenses" />
      <MetricCard title="Net cash flow" value={currency(data.netCashFlow)} detail="Income less expenses" testId="net-cash-flow" />
    </section>
    <div style={{ margin: '15px 0 8px', color: '#7b8983', fontFamily: 'var(--app-font-mono)', fontSize: 9, letterSpacing: '.08em' }}>CURRENT MONTH · {monthLabel(data.currentMonth).toUpperCase()}</div>
    <section className="metrics-grid dashboard-summary-grid" aria-label="Current month transaction summary">
      <MetricCard title="Monthly income" value={currency(data.currentMonthIncome)} detail="Income this month" testId="monthly-income" />
      <MetricCard title="Monthly expenses" value={currency(data.currentMonthExpenses)} detail="Expenses this month" testId="monthly-expenses" />
      <MetricCard title="Monthly net cash flow" value={currency(data.currentMonthNetCashFlow)} detail="Income less expenses" testId="monthly-net-cash-flow" />
    </section>
    <section className="chart-grid chart-grid-main">
      <Card className="chart-card income-chart">
        <div className="chart-heading"><div><span className="chart-kicker">CASH FLOW</span><h2>Income vs expenses</h2><p>Monthly totals from your transactions</p></div><span className="chart-menu icon-button" aria-hidden="true"><MoreHorizontal size={19} /></span></div>
        <div className="chart-legend-inline"><span><i className="legend-swatch income-swatch" /> Income</span><span><i className="legend-swatch expense-swatch" /> Expenses</span></div>
        {data.monthlyTrend.length ? <div className="chart-area"><ResponsiveContainer width="100%" height="100%" debounce={0}><LineChart data={data.monthlyTrend} margin={{ top: 7, right: 10, bottom: 0, left: -12 }}><CartesianGrid vertical={false} stroke="#e9eee9" strokeDasharray="3 5" /><XAxis dataKey="month" tickFormatter={monthLabel} axisLine={false} tickLine={false} tick={{ fill: '#83908e', fontSize: 10 }} dy={9} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#83908e', fontSize: 9 }} tickFormatter={(v) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(v)} /><Tooltip formatter={(value) => currency(Number(value))} labelFormatter={(label) => monthLabel(String(label))} contentStyle={tooltipStyle} isAnimationActive={false} cursor={{ stroke: '#9eafa5', strokeDasharray: '3 3' }} /><Line dataKey="income" name="Income" type="monotone" stroke="#307b70" strokeWidth={2.3} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} /><Line dataKey="expenses" name="Expenses" type="monotone" stroke="#b9d2c9" strokeWidth={2.3} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} /></LineChart></ResponsiveContainer></div> : <div className="empty-state" style={{ padding: '30px 10px' }}><div className="empty-mark"><TrendingUp size={18} /></div><h3>No monthly history</h3><p>Transactions will shape this chart as they are recorded.</p></div>}
      </Card>
      <Card className="chart-card spending-chart">
        <div className="chart-heading"><div><span className="chart-kicker">WHERE IT GOES</span><h2>Spending by category</h2><p>Current-month expense totals</p></div><span className="chart-menu icon-button" aria-hidden="true"><MoreHorizontal size={19} /></span></div>
        {categories.length ? <div className="donut-layout"><div className="donut-plot"><ResponsiveContainer width="100%" height="100%" debounce={0}><PieChart><Pie data={categories} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius="62%" outerRadius="84%" paddingAngle={2} cornerRadius={2} stroke="none" isAnimationActive={false}>{categories.map((entry, index) => <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => currency(Number(value))} contentStyle={tooltipStyle} isAnimationActive={false} /></PieChart></ResponsiveContainer><div className="donut-center"><strong style={{ fontSize: 15 }}>{currency(data.currentMonthExpenses)}</strong><span>this month</span></div></div><div className="category-legend">{categories.map((item, index) => <div className="category-row" key={item.category}><span className="category-label"><i style={{ background: COLORS[index % COLORS.length] }} />{item.category}</span><strong>{currency(item.amount)}</strong></div>)}</div></div> : <div className="empty-state" style={{ padding: '30px 10px' }}><div className="empty-mark"><TrendingUp size={18} /></div><h3>No expense categories</h3><p>Category totals appear here when current-month expenses are recorded.</p></div>}
      </Card>
    </section>
    <section className="chart-grid chart-grid-lower">
      <Card className="chart-card savings-chart">
        <div className="chart-heading"><div><span className="chart-kicker">OVER TIME</span><h2>Monthly net cash flow</h2><p>Server-reported net movement by month</p></div><div className="trend-chip"><TrendingUp size={14} /> Monthly view</div></div>
        {data.monthlyTrend.length ? <div className="chart-area trend-area"><ResponsiveContainer width="100%" height="100%" debounce={0}><LineChart data={data.monthlyTrend} margin={{ top: 12, right: 8, bottom: 0, left: -14 }}><CartesianGrid vertical={false} stroke="#e9eee9" strokeDasharray="3 5" /><XAxis dataKey="month" tickFormatter={monthLabel} axisLine={false} tickLine={false} tick={{ fill: '#83908e', fontSize: 10 }} dy={9} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#83908e', fontSize: 9 }} tickFormatter={(v) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(v)} /><Tooltip formatter={(value) => currency(Number(value))} labelFormatter={(label) => monthLabel(String(label))} contentStyle={tooltipStyle} isAnimationActive={false} cursor={{ stroke: '#9eafa5', strokeDasharray: '3 3' }} /><Line type="monotone" dataKey="netCashFlow" name="Net cash flow" stroke="#307b70" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} /></LineChart></ResponsiveContainer></div> : <div className="empty-state" style={{ padding: '30px 10px' }}><div className="empty-mark"><TrendingUp size={18} /></div><h3>No trend available</h3><p>Monthly cash flow will appear when transaction history is available.</p></div>}
      </Card>
      <Card className="insight-card"><div className="insight-icon"><TrendingUp size={19} /></div><span className="chart-kicker">A NOTE ON THIS VIEW</span><h2>Built for perspective,<br />not prescriptions.</h2><p>Your figures come from the transactions you recorded. SYNOVATE keeps the view clear and leaves decisions to you.</p><div className="insight-rule" /><div className="insight-foot"><span>Account totals</span><span>PRIVATE</span></div></Card>
    </section>
    <div className="dashboard-footnote"><CircleHelp size={15} /><span>Summary and chart values are supplied by your account data. All-time totals include recorded transactions through {data.asOfDate.slice(0, 10)}.</span></div>
  </div>;
}
