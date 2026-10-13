import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Compass,
  DollarSign,
  HelpCircle,
  Info,
  LineChart as LineChartIcon,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Sliders,
  Sparkles,
  Table,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
  Crown,
} from 'lucide-react';
import { Link } from 'wouter';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  useGetAnalyticsSummary,
  useGetGoals,
  useRunSimulation,
  type SimulatorInput,
  type SimulatorResult,
} from '@workspace/api-client-react';
import { Card, Empty, ErrorState, Loading } from '@/components/ui-kit';

const tooltipStyle = {
  background: '#fff',
  border: '1px solid #e6ebe6',
  borderRadius: 10,
  boxShadow: '0 8px 22px rgba(20,50,55,.08)',
  fontFamily: 'DM Sans',
  fontSize: 12,
};

const currency = (amount: number) => {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const dateLabel = (value: string | null | undefined) => {
  if (!value) return 'N/A (Unreachable)';
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const monthLabel = (value: string) => {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'short',
    year: '2-digit',
  });
};

export default function SimulatorPage() {
  const goalsQuery = useGetGoals();
  const summaryQuery = useGetAnalyticsSummary();
  const runSimulationMutation = useRunSimulation();

  const goalsList = goalsQuery.data?.goals ?? [];

  // Form state for adjustments
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [incomeAdjustment, setIncomeAdjustment] = useState<number>(0);
  const [expenseAdjustment, setExpenseAdjustment] = useState<number>(0);
  const [additionalMonthlySavings, setAdditionalMonthlySavings] = useState<number>(0);
  const [oneTimeExpense, setOneTimeExpense] = useState<number>(0);
  const [customTargetAmount, setCustomTargetAmount] = useState<string>('');
  const [customGoalCurrentAmount, setCustomGoalCurrentAmount] = useState<string>('');
  const [customTargetDate, setCustomTargetDate] = useState<string>('');
  const [projectionMonths, setProjectionMonths] = useState<number>(36);

  // Default baseline state override
  const [baselineIncome, setBaselineIncome] = useState<string>('60000');
  const [baselineExpenses, setBaselineExpenses] = useState<string>('42000');

  // Automatically sync defaults when baseline data loads
  useEffect(() => {
    if (summaryQuery.data) {
      const inc = summaryQuery.data.currentMonthIncome || summaryQuery.data.totalIncome || 60000;
      const exp = summaryQuery.data.currentMonthExpenses || Math.round(inc * 0.7);
      setBaselineIncome(String(inc));
      setBaselineExpenses(String(exp));
    }
  }, [summaryQuery.data]);

  useEffect(() => {
    if (goalsList.length > 0 && !selectedGoalId) {
      setSelectedGoalId(goalsList[0].id);
      setCustomTargetAmount(String(goalsList[0].targetAmount));
      setCustomGoalCurrentAmount(String(goalsList[0].currentAmount));
      if (goalsList[0].targetDate) {
        setCustomTargetDate(goalsList[0].targetDate.slice(0, 10));
      }
    }
  }, [goalsList, selectedGoalId]);

  const selectedGoal = useMemo(() => {
    return goalsList.find((g) => g.id === selectedGoalId) ?? goalsList[0];
  }, [goalsList, selectedGoalId]);

  const handleGoalSelect = (id: string) => {
    setSelectedGoalId(id);
    const found = goalsList.find((g) => g.id === id);
    if (found) {
      setCustomTargetAmount(String(found.targetAmount));
      setCustomGoalCurrentAmount(String(found.currentAmount));
      setCustomTargetDate(found.targetDate ? found.targetDate.slice(0, 10) : '');
    }
  };

  // Construct payload for deterministic simulation
  const payload: SimulatorInput = useMemo(() => {
    const baseInc = Math.max(0, Number(baselineIncome) || 60000);
    const baseExp = Math.max(0, Number(baselineExpenses) || 42000);
    const targetAmt = customTargetAmount !== '' ? Math.max(1, Number(customTargetAmount)) : (selectedGoal?.targetAmount ?? 200000);
    const currAmt = customGoalCurrentAmount !== '' ? Math.max(0, Number(customGoalCurrentAmount)) : (selectedGoal?.currentAmount ?? 50000);

    return {
      baselineIncome: baseInc,
      baselineExpenses: baseExp,
      existingSavings: currAmt,
      goalTargetAmount: targetAmt,
      goalCurrentAmount: currAmt,
      goalTargetDate: customTargetDate || selectedGoal?.targetDate || undefined,
      goalId: selectedGoal?.id,
      incomeAdjustment,
      expenseAdjustment,
      additionalMonthlySavings,
      oneTimeExpense,
      customTargetAmount: targetAmt,
      customTargetDate: customTargetDate || undefined,
      projectionMonths,
    };
  }, [
    baselineIncome,
    baselineExpenses,
    customGoalCurrentAmount,
    customTargetAmount,
    customTargetDate,
    selectedGoal,
    incomeAdjustment,
    expenseAdjustment,
    additionalMonthlySavings,
    oneTimeExpense,
    projectionMonths,
  ]);

  // Run simulation on payload change
  const [simResult, setSimResult] = useState<SimulatorResult | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulationMutation.mutate(
        { data: payload },
        {
          onSuccess: (data) => setSimResult(data),
        },
      );
    }, 150);

    return () => clearTimeout(timer);
  }, [payload]);

  // Preset Scenario Handlers
  const applyPreset = (type: 'save_more' | 'income_up' | 'expenses_up' | 'expenses_down' | 'reset') => {
    if (type === 'reset') {
      setIncomeAdjustment(0);
      setExpenseAdjustment(0);
      setAdditionalMonthlySavings(0);
      setOneTimeExpense(0);
      return;
    }
    if (type === 'save_more') {
      setAdditionalMonthlySavings(3000);
      setIncomeAdjustment(0);
      setExpenseAdjustment(0);
    } else if (type === 'income_up') {
      setIncomeAdjustment(10000);
      setExpenseAdjustment(0);
      setAdditionalMonthlySavings(0);
    } else if (type === 'expenses_up') {
      setExpenseAdjustment(5000);
      setIncomeAdjustment(0);
      setAdditionalMonthlySavings(0);
    } else if (type === 'expenses_down') {
      setExpenseAdjustment(-2000);
      setIncomeAdjustment(0);
      setAdditionalMonthlySavings(0);
    }
  };

  const isAdjusted =
    incomeAdjustment !== 0 ||
    expenseAdjustment !== 0 ||
    additionalMonthlySavings !== 0 ||
    oneTimeExpense !== 0;

  // Milestone projection table rows
  const milestoneRows = useMemo(() => {
    if (!simResult?.monthlyTimeline || simResult.monthlyTimeline.length === 0) return [];

    const timeline = simResult.monthlyTimeline;
    const targetAmt = payload.customTargetAmount ?? payload.goalTargetAmount ?? 200000;
    const targetIndices = [6, 12, 24, 36, 60].filter((m) => m <= projectionMonths);

    // Also include final month if not already in list
    if (!targetIndices.includes(projectionMonths)) {
      targetIndices.push(projectionMonths);
    }

    const rows = targetIndices.map((monthNum) => {
      const pt = timeline[Math.min(monthNum, timeline.length - 1)];
      const baseVal = pt?.baselineAccumulated ?? 0;
      const simVal = pt?.simulatedAccumulated ?? 0;
      const diff = simVal - baseVal;
      const simPercent = Math.min(100, Math.round((simVal / targetAmt) * 100));

      return {
        label: `${monthNum} Months (${monthNum / 12 >= 1 ? `${monthNum / 12} yr` : `${monthNum} mo`})`,
        monthLabel: pt?.monthLabel ?? '',
        baseVal,
        simVal,
        diff,
        simPercent,
      };
    });

    return rows;
  }, [simResult, projectionMonths, payload]);

  // Target Date status evaluation
  const targetDateStatus = useMemo(() => {
    const targetStr = payload.customTargetDate || payload.goalTargetDate;
    if (!targetStr || !simResult) return null;

    const targetDate = new Date(`${targetStr.slice(0, 10)}T12:00:00Z`);
    const baselineHits =
      simResult.baseline.projectedCompletionDate &&
      new Date(`${simResult.baseline.projectedCompletionDate}T12:00:00Z`) <= targetDate;
    const simulatedHits =
      simResult.simulated.projectedCompletionDate &&
      new Date(`${simResult.simulated.projectedCompletionDate}T12:00:00Z`) <= targetDate;

    return {
      targetDateStr: targetStr.slice(0, 10),
      baselineHits: Boolean(baselineHits),
      simulatedHits: Boolean(simulatedHits),
    };
  }, [payload.customTargetDate, payload.goalTargetDate, simResult]);

  return (
    <div className="page-content page-enter space-y-6">
      {/* Page Header */}
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            <span>DECISION-SUPPORT CANVAS · DETERMINISTIC</span>
          </div>
          <h1>
            What if you changed your <em>financial plan?</em>
          </h1>
          <p>
            Explore your options before making a financial decision.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary btn-md"
            onClick={() => {
              runSimulationMutation.mutate({ data: payload }, {
                onSuccess: (data) => setSimResult(data),
              });
            }}
            data-testid="button-compare-scenarios"
          >
            <Compass size={15} /> Compare scenarios
          </button>
          <button
            className="btn btn-outline btn-md"
            onClick={() => applyPreset('reset')}
            data-testid="button-reset-assumptions"
          >
            <RotateCcw size={15} /> Reset assumptions
          </button>
        </div>
      </div>

      {/* Mandatory Disclaimer Callout */}
      <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-900/60 flex items-start gap-3 text-emerald-950 dark:text-emerald-200 shadow-sm">
        <Info size={20} className="text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong className="font-semibold block text-emerald-900 dark:text-emerald-100 text-sm mb-0.5">
            Scenario Planning Notice
          </strong>
          These projections are estimates based on your assumptions, not guarantees.
          All calculations are strictly deterministic and operate on temporary scenario variables without altering your saved account ledger.
        </div>
      </div>

      {runSimulationMutation.isError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-amber-600 shrink-0" />
            <div>
              <strong className="block font-semibold">Premium Feature Locked</strong>
              <span>
                {(runSimulationMutation.error as any)?.message ||
                  'Advanced What-If scenario simulations require a Premium subscription.'}
              </span>
            </div>
          </div>
          <Link href="/pricing" className="btn btn-primary btn-sm text-xs font-semibold shrink-0 flex items-center gap-1.5">
            <Crown size={14} /> Upgrade to Premium →
          </Link>
        </div>
      )}

      {/* Preset Scenario Buttons */}
      <div className="surface-card p-4">
        <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2.5 flex items-center gap-1.5">
          <Zap size={14} className="text-amber-500" />
          Quick Scenario Presets
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`btn btn-sm ${
              additionalMonthlySavings === 3000 ? 'btn-primary' : 'btn-outline'
            }`}
            onClick={() => applyPreset('save_more')}
          >
            "What if I save ₹3,000 more per month?"
          </button>
          <button
            className={`btn btn-sm ${
              incomeAdjustment === 10000 ? 'btn-primary' : 'btn-outline'
            }`}
            onClick={() => applyPreset('income_up')}
          >
            "What if my income increases by ₹10,000?"
          </button>
          <button
            className={`btn btn-sm ${
              expenseAdjustment === 5000 ? 'btn-primary' : 'btn-outline'
            }`}
            onClick={() => applyPreset('expenses_up')}
          >
            "What if my monthly expenses increase by ₹5,000?"
          </button>
          <button
            className={`btn btn-sm ${
              expenseAdjustment === -2000 ? 'btn-primary' : 'btn-outline'
            }`}
            onClick={() => applyPreset('expenses_down')}
          >
            "What if I reduce expenses by ₹2,000?"
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (Left) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Baseline Financial Profile Panel */}
          <div className="surface-card p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Coins size={16} className="text-teal-600" />
              1. Current Financial Baseline
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="field-wrap">
                  <label className="field-label">Monthly Income (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="field-input font-mono"
                    value={baselineIncome}
                    onChange={(e) => setBaselineIncome(e.target.value)}
                  />
                </div>

                <div className="field-wrap">
                  <label className="field-label">Monthly Expenses (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="field-input font-mono"
                    value={baselineExpenses}
                    onChange={(e) => setBaselineExpenses(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Baseline Monthly Savings:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  ₹{currency(Math.max(0, (Number(baselineIncome) || 0) - (Number(baselineExpenses) || 0)))}
                </span>
              </div>
            </div>
          </div>

          {/* Goal & Target Selector Panel */}
          <div className="surface-card p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Target size={16} className="text-emerald-600" />
              2. Target Goal & Timeline
            </h3>

            <div className="space-y-3 text-xs">
              {goalsList.length > 0 && (
                <div className="field-wrap">
                  <label className="field-label">Select Goal to Model</label>
                  <select
                    className="field-input"
                    value={selectedGoalId}
                    onChange={(e) => handleGoalSelect(e.target.value)}
                  >
                    {goalsList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} (Target ₹{currency(g.targetAmount)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="field-wrap">
                  <label className="field-label">Target Goal Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="5000"
                    className="field-input font-mono"
                    placeholder={String(selectedGoal?.targetAmount ?? 200000)}
                    value={customTargetAmount}
                    onChange={(e) => setCustomTargetAmount(e.target.value)}
                  />
                </div>

                <div className="field-wrap">
                  <label className="field-label">Current Saved (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="field-input font-mono"
                    placeholder={String(selectedGoal?.currentAmount ?? 50000)}
                    value={customGoalCurrentAmount}
                    onChange={(e) => setCustomGoalCurrentAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="field-wrap">
                  <label className="field-label">Target Date (Optional)</label>
                  <div className="relative">
                    <input
                      type="date"
                      className="field-input"
                      value={customTargetDate}
                      onChange={(e) => setCustomTargetDate(e.target.value)}
                    />
                    {customTargetDate && (
                      <button
                        type="button"
                        onClick={() => setCustomTargetDate('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                        title="Clear target date"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="field-wrap">
                  <label className="field-label">Projection Horizon</label>
                  <select
                    className="field-input"
                    value={projectionMonths}
                    onChange={(e) => setProjectionMonths(Number(e.target.value))}
                  >
                    <option value={12}>12 Months (1 Year)</option>
                    <option value={24}>24 Months (2 Years)</option>
                    <option value={36}>36 Months (3 Years)</option>
                    <option value={60}>60 Months (5 Years)</option>
                    <option value={120}>120 Months (10 Years)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Adjustments Panel (Sliders & Inputs) */}
          <div className="surface-card p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Sliders size={16} className="text-teal-600" />
              3. What-If Scenario Adjustments
            </h3>

            <div className="space-y-5">
              {/* Additional Monthly Savings */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Additional Monthly Savings
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      step="500"
                      className="w-24 text-right px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-emerald-600 bg-white dark:bg-slate-900"
                      value={additionalMonthlySavings}
                      onChange={(e) => setAdditionalMonthlySavings(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <span className="text-slate-400 text-[11px]">/mo</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="500"
                  className="w-full accent-emerald-600 cursor-pointer"
                  value={additionalMonthlySavings}
                  onChange={(e) => setAdditionalMonthlySavings(Number(e.target.value))}
                />
              </div>

              {/* Income Adjustment */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Monthly Income Change
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="-50000"
                      max="100000"
                      step="1000"
                      className={`w-24 text-right px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold bg-white dark:bg-slate-900 ${
                        incomeAdjustment >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                      value={incomeAdjustment}
                      onChange={(e) => setIncomeAdjustment(Number(e.target.value) || 0)}
                    />
                    <span className="text-slate-400 text-[11px]">/mo</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-30000"
                  max="50000"
                  step="1000"
                  className="w-full accent-teal-600 cursor-pointer"
                  value={incomeAdjustment}
                  onChange={(e) => setIncomeAdjustment(Number(e.target.value))}
                />
              </div>

              {/* Expense Adjustment */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Monthly Expense Change
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="-30000"
                      max="50000"
                      step="500"
                      className={`w-24 text-right px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold bg-white dark:bg-slate-900 ${
                        expenseAdjustment <= 0 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                      value={expenseAdjustment}
                      onChange={(e) => setExpenseAdjustment(Number(e.target.value) || 0)}
                    />
                    <span className="text-slate-400 text-[11px]">/mo</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-20000"
                  max="40000"
                  step="500"
                  className="w-full accent-amber-600 cursor-pointer"
                  value={expenseAdjustment}
                  onChange={(e) => setExpenseAdjustment(Number(e.target.value))}
                />
              </div>

              {/* One-Time Expense */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    One-Time Lump-Sum Expense
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="500000"
                      step="5000"
                      className="w-24 text-right px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-rose-600 bg-white dark:bg-slate-900"
                      value={oneTimeExpense}
                      onChange={(e) => setOneTimeExpense(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200000"
                  step="5000"
                  className="w-full accent-rose-600 cursor-pointer"
                  value={oneTimeExpense}
                  onChange={(e) => setOneTimeExpense(Number(e.target.value))}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Deducted immediately from current savings pool.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Column (Right) */}
        <div className="lg:col-span-7 space-y-5">
          {!simResult ? (
            <Card className="p-8">
              <Loading label="Simulating financial scenario..." />
            </Card>
          ) : (
            <>
              {/* Summary Impact Banner */}
              <div
                className={`p-5 rounded-xl border flex items-start gap-4 transition-all ${
                  simResult.simulated.isUnreachable
                    ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                    : (simResult.comparison.monthsSaved ?? 0) > 0
                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                }`}
              >
                {simResult.simulated.isUnreachable ? (
                  <AlertTriangle size={24} className="text-rose-600 shrink-0 mt-0.5" />
                ) : (simResult.comparison.monthsSaved ?? 0) > 0 ? (
                  <Sparkles size={24} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Compass size={24} className="text-teal-600 shrink-0 mt-0.5" />
                )}

                <div className="flex-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider block opacity-75">
                    Simulation Outcome
                  </span>
                  <h3 className="text-base font-bold mt-0.5">
                    {simResult.comparison.summaryText}
                  </h3>
                  <p className="text-xs opacity-90 mt-1 leading-relaxed">
                    {simResult.simulated.isUnreachable
                      ? simResult.simulated.statusNote
                      : `With simulated monthly savings of ₹${currency(
                          simResult.simulated.effectiveMonthlySavings,
                        )}, your goal is projected for completion in ${
                          simResult.simulated.monthsToGoal
                        } month${simResult.simulated.monthsToGoal === 1 ? '' : 's'} (${dateLabel(
                          simResult.simulated.projectedCompletionDate,
                        )}).`}
                  </p>

                  {targetDateStatus && (
                    <div className="mt-2.5 pt-2 border-t border-current/15 flex items-center gap-2 text-xs">
                      <Calendar size={14} className="shrink-0" />
                      <span>
                        Target Date ({dateLabel(targetDateStatus.targetDateStr)}):{' '}
                        {targetDateStatus.simulatedHits ? (
                          <strong className="text-emerald-700 dark:text-emerald-300">
                            Achieved on or before target date!
                          </strong>
                        ) : (
                          <strong className="text-amber-700 dark:text-amber-300">
                            Misses target date under this scenario.
                          </strong>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Comparison Grid: CURRENT PLAN vs WHAT-IF PLAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Current Baseline Card */}
                <div className="surface-card p-4 border border-slate-200 dark:border-slate-800">
                  <span className="chart-kicker block mb-1">CURRENT PLAN</span>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
                    <span>Baseline Path</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Unchanged
                    </span>
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      <span className="text-slate-500">Monthly Income</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        ₹{currency(simResult.baseline.monthlyIncome)}
                      </strong>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      <span className="text-slate-500">Monthly Expenses</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        ₹{currency(simResult.baseline.monthlyExpenses)}
                      </strong>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      <span className="text-slate-500">Monthly Surplus (Savings)</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        ₹{currency(simResult.baseline.effectiveMonthlySavings)}
                      </strong>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      <span className="text-slate-500">Months to Goal</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {simResult.baseline.monthsToGoal !== null
                          ? `${simResult.baseline.monthsToGoal} mos`
                          : 'Unreachable'}
                      </strong>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      <span className="text-slate-500">Completion Date</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {dateLabel(simResult.baseline.projectedCompletionDate)}
                      </strong>
                    </div>

                    <div className="flex justify-between pt-0.5">
                      <span className="text-slate-500">Remaining to Target</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        ₹{currency(simResult.baseline.remainingGoalAmount)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Simulated Scenario Card */}
                <div className="surface-card p-4 border border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="chart-kicker block text-emerald-700 dark:text-emerald-400">
                      YOUR SCENARIO
                    </span>
                    {simResult.comparison.monthlySavingsDifference !== 0 && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          simResult.comparison.monthlySavingsDifference > 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                        }`}
                      >
                        {simResult.comparison.monthlySavingsDifference > 0 ? '+' : ''}₹
                        {currency(simResult.comparison.monthlySavingsDifference)}/mo
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-between">
                    <span>Simulated Path</span>
                    {simResult.comparison.monthsSaved !== null && simResult.comparison.monthsSaved !== 0 && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          simResult.comparison.monthsSaved > 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                        }`}
                      >
                        {simResult.comparison.monthsSaved > 0
                          ? `${simResult.comparison.monthsSaved} mo earlier`
                          : `${Math.abs(simResult.comparison.monthsSaved)} mo later`}
                      </span>
                    )}
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      <span className="text-slate-500">Monthly Income</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-mono">
                        ₹{currency(simResult.simulated.monthlyIncome)}
                      </strong>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      <span className="text-slate-500">Monthly Expenses</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        ₹{currency(simResult.simulated.monthlyExpenses)}
                      </strong>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      <span className="text-slate-500">New Monthly Savings</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-mono">
                        ₹{currency(simResult.simulated.effectiveMonthlySavings)}
                      </strong>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      <span className="text-slate-500">Months to Goal</span>
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {simResult.simulated.monthsToGoal !== null
                          ? `${simResult.simulated.monthsToGoal} mos`
                          : 'Unreachable'}
                      </strong>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      <span className="text-slate-500">Completion Date</span>
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {dateLabel(simResult.simulated.projectedCompletionDate)}
                      </strong>
                    </div>

                    <div className="flex justify-between pt-0.5">
                      <span className="text-slate-500">Remaining to Target</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-mono">
                        ₹{currency(simResult.simulated.remainingGoalAmount)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Projection Timeline Chart (Recharts) */}
              <Card className="p-5">
                <div className="chart-heading mb-3">
                  <div>
                    <span className="chart-kicker">ACCUMULATION TRAJECTORY</span>
                    <h2>Goal Projection Timeline</h2>
                    <p>
                      Visualizing wealth accumulation trajectory over {projectionMonths} months: Current Plan vs What-If Plan.
                    </p>
                  </div>
                </div>

                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={simResult.monthlyTimeline}
                      margin={{ top: 10, right: 20, bottom: 0, left: -10 }}
                    >
                      <CartesianGrid vertical={false} stroke="#e9eee9" strokeDasharray="3 5" />
                      <XAxis
                        dataKey="monthLabel"
                        tickFormatter={monthLabel}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#83908e', fontSize: 10 }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#83908e', fontSize: 9 }}
                        tickFormatter={(v) =>
                          new Intl.NumberFormat(undefined, {
                            notation: 'compact',
                            maximumFractionDigits: 1,
                          }).format(v)
                        }
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          `₹${currency(Number(value))}`,
                          name === 'baselineAccumulated' ? 'Current Plan' : 'What-If Plan',
                        ]}
                        labelFormatter={(label) => monthLabel(String(label))}
                        contentStyle={tooltipStyle}
                      />
                      <Legend
                        formatter={(value) =>
                          value === 'baselineAccumulated' ? 'Current Plan' : 'What-If Plan'
                        }
                        wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                      />
                      <ReferenceLine
                        y={payload.goalTargetAmount ?? 200000}
                        stroke="#d97706"
                        strokeDasharray="4 4"
                        label={{
                          value: `Target ₹${currency(payload.goalTargetAmount ?? 200000)}`,
                          fill: '#d97706',
                          fontSize: 10,
                          position: 'insideTopLeft',
                        }}
                      />
                      <Line
                        dataKey="baselineAccumulated"
                        name="baselineAccumulated"
                        type="monotone"
                        stroke="#64748b"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        dataKey="simulatedAccumulated"
                        name="simulatedAccumulated"
                        type="monotone"
                        stroke="#059669"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Savings Projection Milestones Table */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="chart-kicker">MILESTONE BREAKDOWN</span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Table size={15} className="text-teal-600" />
                      Savings Projection Milestones
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Target: ₹{currency(payload.goalTargetAmount ?? 200000)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-left">
                        <th className="py-2.5 font-semibold">Milestone</th>
                        <th className="py-2.5 font-semibold text-right">Current Plan</th>
                        <th className="py-2.5 font-semibold text-right">What-If Plan</th>
                        <th className="py-2.5 font-semibold text-right">Net Boost</th>
                        <th className="py-2.5 font-semibold text-right">Target Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {milestoneRows.map((row) => (
                        <tr key={row.label} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">
                            {row.label}
                          </td>
                          <td className="py-2.5 font-mono text-right text-slate-600 dark:text-slate-400">
                            ₹{currency(row.baseVal)}
                          </td>
                          <td className="py-2.5 font-mono text-right font-bold text-emerald-700 dark:text-emerald-400">
                            ₹{currency(row.simVal)}
                          </td>
                          <td className="py-2.5 font-mono text-right">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] ${
                                row.diff > 0
                                  ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold'
                                  : row.diff < 0
                                  ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400 font-bold'
                                  : 'text-slate-500'
                              }`}
                            >
                              {row.diff > 0 ? '+' : ''}₹{currency(row.diff)}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-mono text-slate-700 dark:text-slate-300">
                                {row.simPercent}%
                              </span>
                              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${row.simPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
