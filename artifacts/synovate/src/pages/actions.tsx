import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';
import {
  AlertCircle,
  Archive,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Filter,
  Flag,
  HelpCircle,
  History,
  Info,
  ListFilter,
  PiggyBank,
  RefreshCw,
  Repeat,
  RotateCcw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { Link } from 'wouter';
import { Card, Empty, ErrorState, Loading } from '@/components/ui-kit';

export type ActionType =
  | 'Reduce expense'
  | 'Increase savings'
  | 'Review recurring expense'
  | 'Increase goal contribution'
  | 'Review goal target'
  | 'Review deadline'
  | 'Track spending category';

export type ActionPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ActionStatus = 'PENDING' | 'COMPLETED' | 'DISMISSED' | 'SAVED';

export interface ActionPlanItem {
  id: string;
  actionType: ActionType;
  title: string;
  reason: string;
  estimatedImpact: string;
  priority: ActionPriority;
  suggestedTimeframe: string;
  status: ActionStatus;
  completedAt?: string | null;
  createdAt: string;
}

export interface MonthlyActionSummary {
  month: string;
  totalActions: number;
  completedCount: number;
  dismissedCount: number;
  activeCount: number;
  savedCount: number;
  completionPercentage: number;
  unlockedMonthlyImpact: number;
}

export interface ActionPlanResponse {
  actions: ActionPlanItem[];
  summary: MonthlyActionSummary;
  nextThreeActions: ActionPlanItem[];
}

const actionTypeIcons: Record<ActionType, typeof Scissors> = {
  'Reduce expense': Scissors,
  'Increase savings': PiggyBank,
  'Review recurring expense': Repeat,
  'Increase goal contribution': Target,
  'Review goal target': Flag,
  'Review deadline': Calendar,
  'Track spending category': Tag,
};

const actionTypeColors: Record<ActionType, string> = {
  'Reduce expense': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
  'Increase savings': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  'Review recurring expense': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  'Increase goal contribution': 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900',
  'Review goal target': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900',
  'Review deadline': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  'Track spending category': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900',
};

const priorityBadges: Record<ActionPriority, { label: string; className: string }> = {
  HIGH: { label: 'High Priority', className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300' },
  MEDIUM: { label: 'Medium Priority', className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300' },
  LOW: { label: 'Low Priority', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

export default function ActionPlanPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'active' | 'saved' | 'history'>('active');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  const { data, isLoading, isError, refetch } = useQuery<ActionPlanResponse>({
    queryKey: ['/api/actions'],
    queryFn: async () => {
      const res = await customFetch<ActionPlanResponse>('/api/actions', { method: 'GET' });
      return res;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ActionStatus }) => {
      return customFetch(`/api/actions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/actions'] });
    },
  });

  if (isLoading) {
    return (
      <div className="page-content page-enter">
        <div className="page-intro">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              <span>PHASE 8 — FINANCIAL ACTION PLAN</span>
            </div>
            <h1>
              Personalized <em>Action Plan</em>
            </h1>
            <p>Generating verified recommendations from your current accounts and goals...</p>
          </div>
        </div>
        <Card className="p-12">
          <Loading label="Analyzing financial accounts and generating action steps..." />
        </Card>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="page-content page-enter">
        <div className="page-intro">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              <span>PHASE 8 — FINANCIAL ACTION PLAN</span>
            </div>
            <h1>
              Personalized <em>Action Plan</em>
            </h1>
          </div>
        </div>
        <ErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  const { actions, summary } = data;

  // Filter actions based on active tab
  const tabFilteredActions = actions.filter((action) => {
    if (activeTab === 'active') {
      return action.status === 'PENDING' || action.status === 'SAVED';
    }
    if (activeTab === 'saved') {
      return action.status === 'SAVED';
    }
    if (activeTab === 'history') {
      return action.status === 'COMPLETED' || action.status === 'DISMISSED';
    }
    return true;
  });

  // Filter by category type
  const displayedActions = tabFilteredActions.filter((action) => {
    if (selectedTypeFilter === 'all') return true;
    return action.actionType === selectedTypeFilter;
  });

  const handleAction = (id: string, status: ActionStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  return (
    <div className="page-content page-enter space-y-6">
      {/* Page Header */}
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            <span>ACTIONABLE FINANCIAL INTELLIGENCE</span>
          </div>
          <h1>
            Your Financial <em>Action Plan</em>
          </h1>
          <p>
            Prioritized steps based on your cash flow, goals, and recurring commitments.
          </p>
        </div>
      </div>

      {/* Monthly Action Summary Banner */}
      <div className="surface-card p-5 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="chart-kicker block mb-0.5">MONTHLY ACTION SUMMARY · {summary.month}</span>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles size={18} className="text-teal-600" />
              Plan Execution Progress
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {summary.unlockedMonthlyImpact > 0 && (
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                +₹{new Intl.NumberFormat().format(summary.unlockedMonthlyImpact)}/mo unlocked
              </span>
            )}
            <span className="font-mono text-slate-500">
              {summary.completedCount} of {summary.totalActions} completed ({summary.completionPercentage}%)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-teal-600 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${summary.completionPercentage}%` }}
          />
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-500 block mb-0.5">Active Remaining</span>
            <strong className="text-base font-bold text-slate-900 dark:text-slate-100">
              {summary.activeCount}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-500 block mb-0.5">Completed</span>
            <strong className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {summary.completedCount}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-500 block mb-0.5">Saved for Later</span>
            <strong className="text-base font-bold text-indigo-600 dark:text-indigo-400">
              {summary.savedCount}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-500 block mb-0.5">Dismissed / Archived</span>
            <strong className="text-base font-bold text-slate-500">
              {summary.dismissedCount}
            </strong>
          </div>
        </div>
      </div>

      {/* Tabs and Filters Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'active'
                ? 'bg-teal-700 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => setActiveTab('active')}
          >
            Active Plan ({summary.activeCount})
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'saved'
                ? 'bg-teal-700 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => setActiveTab('saved')}
          >
            Saved ({summary.savedCount})
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'history'
                ? 'bg-teal-700 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => setActiveTab('history')}
          >
            History & Completed ({summary.completedCount + summary.dismissedCount})
          </button>
        </div>

        {/* Action Type Filter */}
        <div className="flex items-center gap-2 text-xs">
          <Filter size={14} className="text-slate-400" />
          <select
            className="field-input py-1 px-2 text-xs h-8"
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
          >
            <option value="all">All Action Types</option>
            <option value="Reduce expense">Reduce expense</option>
            <option value="Increase savings">Increase savings</option>
            <option value="Review recurring expense">Review recurring expense</option>
            <option value="Increase goal contribution">Increase goal contribution</option>
            <option value="Review goal target">Review goal target</option>
            <option value="Review deadline">Review deadline</option>
            <option value="Track spending category">Track spending category</option>
          </select>
        </div>
      </div>

      {/* Action Cards List */}
      {displayedActions.length === 0 ? (
        <Card className="p-12 text-center">
          <Empty
            title={activeTab === 'history' ? 'No action history yet' : 'All actions caught up!'}
            description={
              activeTab === 'history'
                ? 'Actions you complete or dismiss will appear here as your financial execution record.'
                : 'You have addressed all recommendations in this view. Check back next billing cycle or view history.'
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedActions.map((action) => {
            const Icon = actionTypeIcons[action.actionType] || Zap;
            const typeColor = actionTypeColors[action.actionType];
            const priorityInfo = priorityBadges[action.priority];
            const isCompleted = action.status === 'COMPLETED';
            const isDismissed = action.status === 'DISMISSED';
            const isSaved = action.status === 'SAVED';

            return (
              <div
                key={action.id}
                className={`surface-card p-5 border transition-all relative flex flex-col justify-between ${
                  isCompleted
                    ? 'border-emerald-200 bg-emerald-50/20 dark:border-emerald-900 dark:bg-emerald-950/10'
                    : isDismissed
                    ? 'border-slate-200 bg-slate-50/50 dark:border-slate-800 opacity-60'
                    : 'border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-800'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeColor}`}
                      >
                        <Icon size={11} />
                        {action.actionType}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityInfo.className}`}>
                        {priorityInfo.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock size={12} />
                      <span>{action.suggestedTimeframe}</span>
                    </div>
                  </div>

                  {/* Title & Reason */}
                  <h3
                    className={`text-sm font-bold mb-2 flex items-start gap-1.5 ${
                      isCompleted
                        ? 'line-through text-slate-500 dark:text-slate-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />}
                    <span>{action.title}</span>
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                    {action.reason}
                  </p>

                  {/* Estimated Impact Pill */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950/50 border border-teal-100 dark:border-teal-900 text-teal-800 dark:text-teal-300 text-[11px] font-medium mb-4">
                    <TrendingUp size={13} className="text-teal-600 shrink-0" />
                    <span>Estimated Impact: <strong>{action.estimatedImpact}</strong></span>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Mark Complete */}
                    {!isCompleted && !isDismissed && (
                      <button
                        className="btn btn-primary btn-sm text-[11px] h-8 px-2.5"
                        onClick={() => handleAction(action.id, 'COMPLETED')}
                        disabled={updateStatusMutation.isPending}
                      >
                        <Check size={13} />
                        <span>Complete</span>
                      </button>
                    )}

                    {/* Bookmark / Save for later */}
                    {!isCompleted && !isDismissed && (
                      <button
                        className={`btn btn-sm text-[11px] h-8 px-2.5 ${
                          isSaved ? 'btn-secondary text-indigo-700' : 'btn-outline'
                        }`}
                        onClick={() => handleAction(action.id, isSaved ? 'PENDING' : 'SAVED')}
                        disabled={updateStatusMutation.isPending}
                        title={isSaved ? 'Remove from saved' : 'Save for later'}
                      >
                        {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                      </button>
                    )}

                    {/* Dismiss */}
                    {!isCompleted && !isDismissed && (
                      <button
                        className="btn btn-outline btn-sm text-[11px] h-8 px-2 text-slate-400 hover:text-slate-600"
                        onClick={() => handleAction(action.id, 'DISMISSED')}
                        disabled={updateStatusMutation.isPending}
                        title="Dismiss action"
                      >
                        <X size={13} />
                      </button>
                    )}

                    {/* Reopen Action (for history tab) */}
                    {(isCompleted || isDismissed) && (
                      <button
                        className="btn btn-outline btn-sm text-[11px] h-8 px-2.5"
                        onClick={() => handleAction(action.id, 'PENDING')}
                        disabled={updateStatusMutation.isPending}
                      >
                        <RotateCcw size={13} />
                        <span>Reopen</span>
                      </button>
                    )}
                  </div>

                  {/* Ask AI Context Link */}
                  <Link
                    href="/assistant"
                    className="text-[11px] text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Sparkles size={12} />
                    <span>Ask AI</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trust & Architecture Notice */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3 text-slate-600 dark:text-slate-400 text-xs">
        <ShieldCheck size={18} className="text-teal-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-semibold text-slate-900 dark:text-slate-100 block mb-0.5">
            Verified Application Basis
          </strong>
          All action recommendations are generated deterministically from your recorded financial profile, current monthly transactions, and configured financial goals. SYNOVATE does not provide speculative or unsupported investment advice.
        </div>
      </div>
    </div>
  );
}
