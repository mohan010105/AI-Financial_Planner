import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  GraduationCap,
  History,
  Home,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Plane,
  Pencil,
  X,
} from 'lucide-react';
import {
  getGetGoalQueryKey,
  getGetGoalsQueryKey,
  getGetGoalsStatusQueryKey,
  useAddGoalContribution,
  useCreateGoal,
  useDeleteGoal,
  useGetGoal,
  useGetGoals,
  useUpdateGoal,
  type FinancialGoal,
  type GoalContribution,
  type GoalInput,
  type GoalPriority,
  type GoalType,
} from '@workspace/api-client-react';
import { Button, Card, Empty, ErrorState, Loading } from '@/components/ui-kit';

const goalTypeLabels: Record<GoalType, { label: string; icon: typeof Target }> = {
  emergency_fund: { label: 'Emergency Fund', icon: ShieldCheck },
  education: { label: 'Education', icon: GraduationCap },
  travel: { label: 'Travel', icon: Plane },
  major_purchase: { label: 'Major Purchase', icon: Home },
  debt_reduction: { label: 'Debt Reduction', icon: CreditCard },
  savings: { label: 'Savings', icon: Coins },
  custom_goal: { label: 'Custom Goal', icon: Target },
};

const priorityBadges: Record<GoalPriority, { label: string; colorClass: string }> = {
  low: { label: 'Low Priority', colorClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  medium: { label: 'Medium Priority', colorClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' },
  high: { label: 'High Priority', colorClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  critical: { label: 'Critical', colorClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' },
};

const dateToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const currency = (amount: number) => {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const dateLabel = (value: string) => {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

type GoalFormState = {
  name: string;
  type: GoalType;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  priority: GoalPriority;
  notes: string;
};

const defaultForm = (): GoalFormState => ({
  name: '',
  type: 'savings',
  targetAmount: '',
  currentAmount: '0',
  targetDate: dateToday(),
  priority: 'medium',
  notes: '',
});

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<FinancialGoal | null>(null);
  const [historyGoalId, setHistoryGoalId] = useState<string | null>(null);
  const [deleteConfirmGoal, setDeleteConfirmGoal] = useState<FinancialGoal | null>(null);

  const goalsQuery = useGetGoals();

  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();
  const addContributionMutation = useAddGoalContribution();

  const historyQuery = useGetGoal(historyGoalId ?? '', {
    query: { enabled: Boolean(historyGoalId), queryKey: getGetGoalQueryKey(historyGoalId ?? '') },
  });

  const goalsList = goalsQuery.data?.goals ?? [];
  const overallSummary = goalsQuery.data?.overallSummary;

  const filteredGoals = goalsList.filter((g) => {
    if (filter === 'active') return !g.metrics.isCompleted;
    if (filter === 'completed') return g.metrics.isCompleted;
    return true;
  });

  const invalidateGoals = () => {
    void queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetGoalsStatusQueryKey() });
  };

  const handleSaveGoal = (values: GoalFormState) => {
    const targetAmount = Number(values.targetAmount);
    const currentAmount = Number(values.currentAmount || 0);

    const payload: GoalInput = {
      name: values.name.trim(),
      type: values.type,
      targetAmount,
      currentAmount,
      targetDate: values.targetDate,
      priority: values.priority,
      notes: values.notes.trim(),
    };

    if (editingGoal) {
      updateGoalMutation.mutate(
        { goalId: editingGoal.id, data: payload },
        {
          onSuccess: () => {
            setEditingGoal(null);
            invalidateGoals();
          },
        },
      );
    } else {
      createGoalMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            setIsCreateOpen(false);
            invalidateGoals();
          },
        },
      );
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    deleteGoalMutation.mutate(
      { goalId },
      {
        onSuccess: () => {
          setDeleteConfirmGoal(null);
          invalidateGoals();
        },
      },
    );
  };

  const handleAddContribution = (amount: number, contributionDate: string, note: string) => {
    if (!contributeGoal) return;
    addContributionMutation.mutate(
      {
        goalId: contributeGoal.id,
        data: { amount, contributionDate, note },
      },
      {
        onSuccess: () => {
          setContributeGoal(null);
          invalidateGoals();
        },
      },
    );
  };

  return (
    <div className="page-content page-enter">
      {/* Page Header */}
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            <span>FINANCIAL TARGETS & ACCUMULATION</span>
          </div>
          <h1>
            Make your financial <em>goals achievable.</em>
          </h1>
          <p>
            Set targets, track progress deterministically, and calculate required monthly contributions from your surplus.
          </p>
        </div>
        <button
          className="btn btn-primary btn-md"
          data-testid="button-create-goal"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus size={16} />
          Add New Goal
        </button>
      </div>

      {/* Overview Cards */}
      {goalsQuery.isLoading ? (
        <div className="mb-6">
          <Loading label="Calculating goal metrics..." />
        </div>
      ) : goalsQuery.isError ? (
        <div className="mb-6">
          <ErrorState
            error={goalsQuery.error}
            title="We couldn’t load your financial goals."
            description="A problem occurred while retrieving your goals and calculating metrics. Please try again."
            onRetry={() => void goalsQuery.refetch()}
          />
        </div>
      ) : (
        <>
          <div className="metrics-grid">
            <div className="surface-card metric-card">
              <div className="metric-top">
                <span>Active Goals</span>
                <Target size={16} className="text-emerald-600" />
              </div>
              <strong className="metric-value">
                {overallSummary?.activeGoalsCount ?? 0}
              </strong>
              <div className="metric-foot">
                <span>Total created: {overallSummary?.totalGoals ?? 0}</span>
              </div>
            </div>

            <div className="surface-card metric-card">
              <div className="metric-top">
                <span>Completed</span>
                <CheckCircle2 size={16} className="text-emerald-600" />
              </div>
              <strong className="metric-value">
                {overallSummary?.completedGoalsCount ?? 0}
              </strong>
              <div className="metric-foot">
                <span>Achieved milestones</span>
              </div>
            </div>

            <div className="surface-card metric-card">
              <div className="metric-top">
                <span>Total Saved</span>
                <Coins size={16} className="text-teal-600" />
              </div>
              <strong className="metric-value">
                ₹{currency(overallSummary?.totalCurrentAmount ?? 0)}
              </strong>
              <div className="metric-foot">
                <span>Of ₹{currency(overallSummary?.totalTargetAmount ?? 0)} target</span>
              </div>
            </div>

            <div className="surface-card metric-card">
              <div className="metric-top">
                <span>Total Remaining</span>
                <Clock size={16} className="text-amber-600" />
              </div>
              <strong className="metric-value">
                ₹{currency(overallSummary?.totalRemainingAmount ?? 0)}
              </strong>
              <div className="metric-foot">
                <span>Outstanding target balance</span>
              </div>
            </div>

            <div className="surface-card metric-card">
              <div className="metric-top">
                <span>Overall Progress</span>
                <TrendingUp size={16} className="text-indigo-600" />
              </div>
              <strong className="metric-value">
                {overallSummary?.overallProgressPercentage ?? 0}%
              </strong>
              <div className="metric-foot">
                <span>Average completion rate</span>
              </div>
            </div>
          </div>

          {/* Feasibility Alert Callout if goals need adjustment */}
          {(overallSummary?.needsAdjustmentCount ?? 0) > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60 flex items-start gap-3 text-amber-900 dark:text-amber-200">
              <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-sm">
                  {overallSummary?.needsAdjustmentCount === 1
                    ? '1 Goal may require adjustment'
                    : `${overallSummary?.needsAdjustmentCount} Goals may require adjustment`}
                </strong>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  Required monthly contributions for one or more goals exceed your available monthly surplus or target dates have passed. Review individual goal indicators below.
                </p>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                onClick={() => setFilter('all')}
              >
                All Goals ({goalsList.length})
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filter === 'active'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                onClick={() => setFilter('active')}
              >
                Active ({overallSummary?.activeGoalsCount ?? 0})
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filter === 'completed'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                onClick={() => setFilter('completed')}
              >
                Completed ({overallSummary?.completedGoalsCount ?? 0})
              </button>
            </div>
          </div>

          {/* Goal Cards Grid */}
          {filteredGoals.length === 0 ? (
            <Empty
              title={
                filter === 'active'
                  ? 'No active financial goals'
                  : filter === 'completed'
                  ? 'No completed goals yet'
                  : 'No financial goals found'
              }
              description="Set up your emergency fund, education fund, or major purchase targets to begin deterministic progress tracking."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGoals.map((goal) => {
                const typeInfo = goalTypeLabels[goal.type] ?? goalTypeLabels.custom_goal;
                const IconComponent = typeInfo.icon;
                const priorityInfo = priorityBadges[goal.priority] ?? priorityBadges.medium;
                const m = goal.metrics;

                return (
                  <div
                    key={goal.id}
                    className={`surface-card p-5 flex flex-direction flex-col justify-between transition-all duration-200 border ${
                      m.isCompleted
                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : m.needsAdjustment
                        ? 'border-amber-200 dark:border-amber-900/60'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Top Badges & Actions */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          <IconComponent size={14} className="text-emerald-600 dark:text-emerald-400" />
                          {typeInfo.label}
                        </span>

                        <div className="flex items-center gap-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${priorityInfo.colorClass}`}
                          >
                            {priorityInfo.label}
                          </span>
                          <button
                            className="icon-button"
                            title="Edit Goal"
                            onClick={() => setEditingGoal(goal)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-button hover:text-rose-600"
                            title="Delete Goal"
                            onClick={() => setDeleteConfirmGoal(goal)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Goal Title */}
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                        {goal.name}
                      </h3>
                      {goal.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                          {goal.notes}
                        </p>
                      )}

                      {/* Progress Bar & Amounts */}
                      <div className="my-4">
                        <div className="flex items-baseline justify-between gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Saved ₹{currency(goal.currentAmount)}
                          </span>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Target ₹{currency(goal.targetAmount)}
                          </span>
                        </div>

                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              m.isCompleted
                                ? 'bg-emerald-500'
                                : m.needsAdjustment
                                ? 'bg-amber-500'
                                : 'bg-teal-600'
                            }`}
                            style={{ width: `${m.progressPercentage}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-teal-700 dark:text-teal-400">
                            {m.progressPercentage}% Complete
                          </span>
                          <span>Remaining ₹{currency(m.remainingAmount)}</span>
                        </div>
                      </div>

                      {/* Deterministic Calculations Grid */}
                      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs mb-3">
                        <div>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Target Date
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {dateLabel(goal.targetDate)}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Months Remaining
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {m.isCompleted
                              ? '0 (Completed)'
                              : m.isPastTargetDate
                              ? '0 (Past target)'
                              : m.monthsRemaining === 0
                              ? '0 (Due this month)'
                              : `${m.monthsRemaining} mos`}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Req. Monthly
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {m.isCompleted
                              ? '₹0.00'
                              : m.monthsRemaining === 0
                              ? `₹${currency(m.requiredMonthlyContribution)} (immediate)`
                              : `₹${currency(m.requiredMonthlyContribution)}/mo`}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Projected Done
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {m.isCompleted
                              ? 'Completed'
                              : m.projectedCompletionDate
                              ? dateLabel(m.projectedCompletionDate)
                              : 'Requires contribs'}
                          </span>
                        </div>
                      </div>

                      {/* Adjustment / Warning Note */}
                      {m.needsAdjustment && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/50 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2 mb-3">
                          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                          <span className="leading-tight font-medium">
                            {m.statusNote}
                          </span>
                        </div>
                      )}

                      {m.isCompleted && (
                        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 mb-3">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <span className="font-semibold">Goal completed successfully! Target reached.</span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {!m.isCompleted && (
                        <button
                          className="btn btn-primary btn-sm flex-1"
                          onClick={() => setContributeGoal(goal)}
                        >
                          <Plus size={14} /> Add Contribution
                        </button>
                      )}
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setHistoryGoalId(goal.id)}
                      >
                        <History size={14} /> History
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Engine Disclaimer & Integrity Notice */}
          <div className="dashboard-footnote mt-8">
            <ShieldCheck size={16} className="text-teal-700 shrink-0" />
            <span>
              <strong>Deterministic Goal Planning Engine:</strong> All remaining balances, required monthly contributions, and projected completion dates are computed using mathematical equations. No AI models are used for numerical calculations. Projections are mathematical estimates based on current rates, not financial guarantees.
            </span>
          </div>
        </>
      )}

      {/* Modal: Create or Edit Goal */}
      {(isCreateOpen || editingGoal) && (
        <GoalModalDialog
          initial={editingGoal ?? undefined}
          busy={createGoalMutation.isPending || updateGoalMutation.isPending}
          error={
            createGoalMutation.error?.message ||
            updateGoalMutation.error?.message
          }
          onCancel={() => {
            setIsCreateOpen(false);
            setEditingGoal(null);
          }}
          onSave={handleSaveGoal}
        />
      )}

      {/* Modal: Add Contribution */}
      {contributeGoal && (
        <ContributionModalDialog
          goal={contributeGoal}
          busy={addContributionMutation.isPending}
          error={addContributionMutation.error?.message}
          onCancel={() => setContributeGoal(null)}
          onSave={handleAddContribution}
        />
      )}

      {/* Modal: Goal History & Detail */}
      {historyGoalId && (
        <GoalHistoryModalDialog
          goalDetail={historyQuery.data}
          loading={historyQuery.isLoading}
          onClose={() => setHistoryGoalId(null)}
        />
      )}

      {/* Modal: Delete Confirmation */}
      {deleteConfirmGoal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setDeleteConfirmGoal(null)}>
          <div
            className="modal-panel"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading mb-3">
              <h2 className="text-rose-700">Delete Goal</h2>
              <button className="icon-button" onClick={() => setDeleteConfirmGoal(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Are you sure you want to delete <strong>"{deleteConfirmGoal.name}"</strong>? All contribution history for this goal will be removed.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn btn-outline btn-sm" onClick={() => setDeleteConfirmGoal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm bg-rose-700 hover:bg-rose-800"
                disabled={deleteGoalMutation.isPending}
                onClick={() => handleDeleteGoal(deleteConfirmGoal.id)}
              >
                {deleteGoalMutation.isPending ? 'Deleting...' : 'Delete Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Dialog: Create/Edit Goal
function GoalModalDialog({
  initial,
  busy,
  error,
  onCancel,
  onSave,
}: {
  initial?: FinancialGoal;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (values: GoalFormState) => void;
}) {
  const [form, setForm] = useState<GoalFormState>(() =>
    initial
      ? {
          name: initial.name,
          type: initial.type,
          targetAmount: String(initial.targetAmount),
          currentAmount: String(initial.currentAmount),
          targetDate: initial.targetDate.slice(0, 10),
          priority: initial.priority,
          notes: initial.notes ?? '',
        }
      : defaultForm(),
  );
  const [validation, setValidation] = useState('');

  const update = <K extends keyof GoalFormState>(key: K, value: GoalFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const target = Number(form.targetAmount);
    const current = Number(form.currentAmount || 0);

    if (!form.name.trim()) {
      setValidation('Goal name is required.');
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      setValidation('Target amount must be a positive number.');
      return;
    }
    if (!Number.isFinite(current) || current < 0) {
      setValidation('Current amount cannot be negative.');
      return;
    }
    setValidation('');
    onSave(form);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-panel max-w-lg" role="dialog">
        <div className="modal-heading mb-4">
          <h2>{initial ? 'Edit Financial Goal' : 'Create Financial Goal'}</h2>
          <button className="icon-button" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(validation || error) && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex flex-col gap-2">
              <span>{validation || error}</span>
              {error && (error.includes('limit') || error.includes('Upgrade') || error.includes('Free plan')) && (
                <a href="/pricing" className="font-semibold underline text-teal-800 flex items-center gap-1">
                  View Premium Plan for unlimited goals →
                </a>
              )}
            </div>
          )}

          <div className="field-wrap">
            <label className="field-label">Goal Name</label>
            <input
              type="text"
              className="field-input"
              placeholder="e.g. Emergency Fund, House Down Payment"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="field-wrap">
              <label className="field-label">Goal Type</label>
              <select
                className="field-input"
                value={form.type}
                onChange={(e) => update('type', e.target.value as GoalType)}
              >
                <option value="emergency_fund">Emergency Fund</option>
                <option value="education">Education</option>
                <option value="travel">Travel</option>
                <option value="major_purchase">Major Purchase</option>
                <option value="debt_reduction">Debt Reduction</option>
                <option value="savings">Savings</option>
                <option value="custom_goal">Custom Goal</option>
              </select>
            </div>

            <div className="field-wrap">
              <label className="field-label">Priority</label>
              <select
                className="field-input"
                value={form.priority}
                onChange={(e) => update('priority', e.target.value as GoalPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="field-wrap">
              <label className="field-label">Target Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="field-input"
                placeholder="200000"
                value={form.targetAmount}
                onChange={(e) => update('targetAmount', e.target.value)}
                required
              />
            </div>

            <div className="field-wrap">
              <label className="field-label">Current Amount Saved (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="field-input"
                placeholder="50000"
                value={form.currentAmount}
                onChange={(e) => update('currentAmount', e.target.value)}
              />
            </div>
          </div>

          <div className="field-wrap">
            <label className="field-label">Target Date</label>
            <input
              type="date"
              className="field-input"
              value={form.targetDate}
              onChange={(e) => update('targetDate', e.target.value)}
              required
            />
          </div>

          <div className="field-wrap">
            <label className="field-label">Notes / Description (Optional)</label>
            <textarea
              className="field-input h-20 py-2 resize-none"
              placeholder="Add details about this goal..."
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {busy ? 'Saving...' : initial ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Dialog: Add Contribution
function ContributionModalDialog({
  goal,
  busy,
  error,
  onCancel,
  onSave,
}: {
  goal: FinancialGoal;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (amount: number, date: string, note: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [contributionDate, setContributionDate] = useState(dateToday());
  const [note, setNote] = useState('');
  const [validation, setValidation] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setValidation('Enter a positive contribution amount.');
      return;
    }
    setValidation('');
    onSave(numAmount, contributionDate, note.trim());
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-panel max-w-md" role="dialog">
        <div className="modal-heading mb-3">
          <h2>Add Goal Contribution</h2>
          <button className="icon-button" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs mb-4">
          <span className="block text-slate-500">Contributing towards</span>
          <strong className="text-slate-900 dark:text-slate-100 text-sm">{goal.name}</strong>
          <div className="mt-1 text-slate-600 dark:text-slate-300">
            Saved: ₹{currency(goal.currentAmount)} / Target: ₹{currency(goal.targetAmount)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(validation || error) && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {validation || error}
            </div>
          )}

          <div className="field-wrap">
            <label className="field-label">Contribution Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="field-input"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="field-wrap">
            <label className="field-label">Contribution Date</label>
            <input
              type="date"
              className="field-input"
              value={contributionDate}
              onChange={(e) => setContributionDate(e.target.value)}
              required
            />
          </div>

          <div className="field-wrap">
            <label className="field-label">Note (Optional)</label>
            <input
              type="text"
              className="field-input"
              placeholder="e.g. Monthly salary deposit"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {busy ? 'Saving...' : 'Add Contribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Dialog: Goal History & Detail
function GoalHistoryModalDialog({
  goalDetail,
  loading,
  onClose,
}: {
  goalDetail?: { goal: FinancialGoal; contributions: GoalContribution[] };
  loading: boolean;
  onClose: () => void;
}) {
  const goal = goalDetail?.goal;
  const contributions = goalDetail?.contributions ?? [];

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel max-w-lg max-h-[85vh] flex flex-col" role="dialog">
        <div className="modal-heading mb-3 shrink-0">
          <h2>Goal History & Details</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {loading || !goal ? (
          <div className="py-8">
            <Loading label="Loading goal history..." />
          </div>
        ) : (
          <div className="overflow-y-auto pr-1 space-y-4 flex-1">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">{goal.name}</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 mt-2">
                <div>Saved: <strong>₹{currency(goal.currentAmount)}</strong></div>
                <div>Target: <strong>₹{currency(goal.targetAmount)}</strong></div>
                <div>Progress: <strong>{goal.metrics.progressPercentage}%</strong></div>
                <div>Remaining: <strong>₹{currency(goal.metrics.remainingAmount)}</strong></div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                Contribution Timeline ({contributions.length})
              </h4>
              {contributions.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center italic">
                  No contributions recorded yet. Use "+ Add Contribution" on the goal card to add entries.
                </p>
              ) : (
                <div className="space-y-2">
                  {contributions.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          + ₹{currency(c.amount)}
                        </div>
                        {c.note && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {c.note}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {dateLabel(c.contributionDate)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
