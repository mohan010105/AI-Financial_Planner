import { ArrowDownRight, ArrowUpRight, CircleHelp, Download, MoreHorizontal, TrendingUp } from 'lucide-react';
import { Cell, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { useGetAnalyticsStatus, useHealthCheck } from '@workspace/api-client-react';
import { getGetAnalyticsStatusQueryKey, getHealthCheckQueryKey } from '@workspace/api-client-react';
import { Card, ErrorState, Loading } from '@/components/ui-kit';

const incomeExpenseData = [
  { month: 'Oct', income: 6200, expenses: 4120 }, { month: 'Nov', income: 6480, expenses: 4380 },
  { month: 'Dec', income: 6320, expenses: 4760 }, { month: 'Jan', income: 6750, expenses: 4290 },
  { month: 'Feb', income: 6590, expenses: 4520 }, { month: 'Mar', income: 6840, expenses: 4410 },
];
const spendingData = [
  { name: 'Home', value: 38, color: '#214b51' }, { name: 'Everyday', value: 24, color: '#4f9290' },
  { name: 'Transport', value: 15, color: '#8fb8ad' }, { name: 'Food & dining', value: 13, color: '#c4a36b' },
  { name: 'Other', value: 10, color: '#dce7e2' },
];
const savingsData = [
  { month: 'Oct', amount: 12600 }, { month: 'Nov', amount: 13840 }, { month: 'Dec', amount: 14680 },
  { month: 'Jan', amount: 16120 }, { month: 'Feb', amount: 17820 }, { month: 'Mar', amount: 19440 },
];
const currency = (value: number) => `$${value.toLocaleString('en-US')}`;
const tooltipStyle = { background: '#fff', border: '1px solid #e6ebe6', borderRadius: 10, boxShadow: '0 8px 22px rgba(20,50,55,.08)', fontFamily: 'DM Sans', fontSize: 12 };

function DataNotice() {
  const analytics = useGetAnalyticsStatus({ query: { queryKey: getGetAnalyticsStatusQueryKey() } });
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  if (analytics.isLoading || health.isLoading) return <div className="dashboard-status-loading"><Loading label="Loading service status" /></div>;
  if (analytics.isError || health.isError) return <ErrorState onRetry={() => { void analytics.refetch(); void health.refetch(); }} />;
  return <div className="demo-notice" data-testid="status-analytics"><span className="demo-dot" /><span><strong>Illustrative sample data</strong> · Real financial data is not connected</span><span className="notice-divider" /><span className="health-label" data-testid="status-health"><i className={health.data?.status?.toLowerCase() === 'ok' || health.data?.status?.toLowerCase() === 'healthy' ? 'health-dot' : 'health-dot health-dot-muted'} /> Service {health.data?.status ?? 'available'}</span><span className="notice-phase">ANALYTICS · PHASE {analytics.data?.phase ?? 1} · {analytics.data?.status ?? 'placeholder'}</span></div>;
}

function MetricCard({ title, value, detail, trend, tone, testId }: { title: string; value: string; detail: string; trend?: string; tone?: string; testId: string }) {
  return <Card className="metric-card" data-testid={testId}><div className="metric-top"><span>{title}</span><span className="metric-more icon-button" aria-label={`${title} information`} title="Illustrative sample value"><CircleHelp size={15} /></span></div><strong className="metric-value" data-testid={`value-${testId}`}>{value}</strong><div className="metric-foot">{trend && <span className={`metric-trend ${tone ?? ''}`}>{tone === 'down' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{trend}</span>}<span>{detail}</span></div></Card>;
}

export default function DashboardPage() {
  return <div className="dashboard-page">
    <div className="page-intro dashboard-intro"><div><div className="eyebrow">MONDAY, 18 MARCH 2025 <span className="eyebrow-line" /></div><h1>A clearer view of <em>your money.</em></h1><p>A considered overview of your monthly finances, all in one place.</p></div><button className="btn btn-outline btn-md export-button" data-testid="button-export" onClick={() => window.print()}><Download size={16} /> Export view</button></div>
    <DataNotice />
    <section className="metrics-grid" aria-label="Illustrative financial summary">
      <MetricCard title="Monthly Income" value="$6,840" detail="Compared with last month" trend="+3.8%" testId="monthly-income" />
      <MetricCard title="Monthly Expenses" value="$4,410" detail="Compared with last month" trend="−2.4%" tone="down" testId="monthly-expenses" />
      <MetricCard title="Monthly Savings" value="$2,430" detail="This month · illustrative" trend="+8.6%" testId="monthly-savings" />
      <MetricCard title="Savings Rate" value="35.5%" detail="Illustrative monthly rate" trend="+1.7 pts" testId="savings-rate" />
      <MetricCard title="Active Goals" value="3" detail="Illustrative goal count" testId="active-goals" />
    </section>
    <section className="chart-grid chart-grid-main">
      <Card className="chart-card income-chart">
        <div className="chart-heading"><div><span className="chart-kicker">CASH FLOW</span><h2>Income vs expenses</h2><p>Month-by-month comparison · sample data</p></div><span className="chart-menu icon-button" aria-label="Illustrative chart" title="Illustrative sample chart"><MoreHorizontal size={19} /></span></div>
        <div className="chart-legend-inline"><span><i className="legend-swatch income-swatch" /> Income</span><span><i className="legend-swatch expense-swatch" /> Expenses</span></div>
        <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={incomeExpenseData} barGap={6} margin={{ top: 4, right: 4, bottom: 0, left: -17 }}><CartesianGrid vertical={false} stroke="#e9eee9" strokeDasharray="3 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#83908e', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#83908e', fontSize: 10 }} tickFormatter={(v) => `$${v / 1000}k`} /><Tooltip formatter={(value) => currency(Number(value))} contentStyle={tooltipStyle} cursor={{ fill: '#f4f7f5' }} /><Bar dataKey="income" name="Income" fill="#307b70" radius={[4, 4, 0, 0]} maxBarSize={20} /><Bar dataKey="expenses" name="Expenses" fill="#b9d2c9" radius={[4, 4, 0, 0]} maxBarSize={20} /></BarChart></ResponsiveContainer></div>
      </Card>
      <Card className="chart-card spending-chart">
        <div className="chart-heading"><div><span className="chart-kicker">WHERE IT GOES</span><h2>Spending by category</h2><p>Illustrative monthly breakdown</p></div><span className="chart-menu icon-button" aria-label="Category chart information" title="Illustrative sample chart"><MoreHorizontal size={19} /></span></div>
        <div className="donut-layout"><div className="donut-plot"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={spendingData} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="88%" paddingAngle={3} stroke="none">{spendingData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => `${value}%`} contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>100%</strong><span>sample</span></div></div><div className="category-legend">{spendingData.map((item) => <div className="category-row" key={item.name}><span className="category-label"><i style={{ background: item.color }} />{item.name}</span><strong>{item.value}%</strong></div>)}</div></div>
      </Card>
    </section>
    <section className="chart-grid chart-grid-lower">
      <Card className="chart-card savings-chart">
        <div className="chart-heading"><div><span className="chart-kicker">OVER TIME</span><h2>Savings trend</h2><p>Illustrative accumulated savings · six months</p></div><div className="trend-chip"><TrendingUp size={14} /> Sample trend</div></div>
        <div className="chart-area trend-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={savingsData} margin={{ top: 12, right: 8, bottom: 0, left: -14 }}><CartesianGrid vertical={false} stroke="#e9eee9" strokeDasharray="3 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#83908e', fontSize: 11 }} dy={9} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#83908e', fontSize: 10 }} tickFormatter={(v) => `$${v / 1000}k`} /><Tooltip formatter={(value) => currency(Number(value))} contentStyle={tooltipStyle} /><Line type="monotone" dataKey="amount" name="Savings" stroke="#307b70" strokeWidth={2.5} dot={{ r: 3, fill: '#307b70', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div>
      </Card>
      <Card className="insight-card"><div className="insight-icon"><TrendingUp size={19} /></div><span className="chart-kicker">A NOTE ON THIS VIEW</span><h2>Built for perspective,<br />not prescriptions.</h2><p>These sample figures show how your financial picture could be organized. SYNOVATE doesn’t make decisions for you.</p><div className="insight-rule" /><div className="insight-foot"><span>Illustrative only</span><span>PHASE 1</span></div></Card>
    </section>
    <div className="dashboard-footnote"><CircleHelp size={15} /><span>All figures and charts shown are illustrative sample data. No personal financial information is connected.</span></div>
  </div>;
}
