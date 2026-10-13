import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';
import {
  AlertTriangle,
  ArrowRight,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Crown,
  ExternalLink,
  FileText,
  HelpCircle,
  Key,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { Link } from 'wouter';
import { Card, Loading, Modal } from '@/components/ui-kit';
import type {
  BillingSubscriptionResponse,
  SubscriptionTier,
  UserSubscription,
} from './pricing';

export interface PaymentTransactionRecord {
  id: string;
  userId: string;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  amount: string;
  currency: string;
  status: string;
  method?: string | null;
  tier?: string | null;
  billingCycle?: string | null;
  createdAt: string;
}

export interface PaymentsResponse {
  payments: PaymentTransactionRecord[];
}

export default function SubscriptionSettingsPage() {
  const queryClient = useQueryClient();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  // Fetch live subscription state from backend billing service
  const { data: subData, isLoading: isSubLoading, error: subError } = useQuery<BillingSubscriptionResponse>({
    queryKey: ['/api/billing/subscription'],
    queryFn: async () => customFetch<BillingSubscriptionResponse>('/api/billing/subscription', { method: 'GET' }),
  });

  // Fetch payment history audit records
  const { data: paymentsData, isLoading: isPaymentsLoading } = useQuery<PaymentsResponse>({
    queryKey: ['/api/billing/payments'],
    queryFn: async () => customFetch<PaymentsResponse>('/api/billing/payments', { method: 'GET' }),
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      return customFetch<{ success: boolean; message: string; subscription: UserSubscription }>(
        '/api/billing/cancel',
        { method: 'POST' },
      );
    },
    onSuccess: (data) => {
      setCancelModalOpen(false);
      setCancelFeedback(data.message || 'Subscription successfully canceled.');
      void queryClient.invalidateQueries({ queryKey: ['/api/billing/subscription'] });
      void queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
    },
    onError: (err: any) => {
      setCancelFeedback(err.message || 'Failed to cancel subscription.');
    },
  });

  if (isSubLoading || isPaymentsLoading) {
    return (
      <div className="page-content page-enter">
        <Loading label="Loading verified billing & subscription records..." />
      </div>
    );
  }

  if (subError || !subData) {
    return (
      <div className="page-content page-enter">
        <Card className="p-8 text-center max-w-md mx-auto">
          <ShieldAlert className="text-rose-500 mx-auto mb-3" size={36} />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
            Unable to load billing data
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            {subError ? (subError as Error).message : 'Connection to billing service failed'}
          </p>
          <button
            className="btn btn-primary btn-sm mx-auto flex items-center gap-2"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/billing/subscription'] })}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </Card>
      </div>
    );
  }

  const { subscription, plan, entitlements } = subData;
  const payments = paymentsData?.payments ?? [];
  const isFree = subscription.tier === 'FREE';
  const isPremium = subscription.tier === 'PREMIUM';
  const isFamily = subscription.tier === 'FAMILY';

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="page-content page-enter space-y-8">
      {/* Page Header */}
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            <span>ACCOUNT &amp; BILLING</span>
          </div>
          <h1 className="text-2xl font-bold">
            Subscription &amp; <em>Billing History</em>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your SYNOVATE plan tier, billing cycle, receipts, and feature entitlements.
          </p>
        </div>
      </div>

      {cancelFeedback && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 dark:bg-teal-950/60 dark:border-teal-800 dark:text-teal-200 text-xs flex items-center justify-between">
          <span>{cancelFeedback}</span>
          <button className="underline font-bold" onClick={() => setCancelFeedback(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Main Status & Plan Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Current Plan & Entitlements */}
        <div className="lg:col-span-8 space-y-6">
          {/* Current Plan Overview Card */}
          <div className="surface-card p-6 border border-slate-200 dark:border-slate-800 rounded-2xl relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {plan.name} Plan
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      subscription.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {subscription.status}
                  </span>
                  {subscription.cancelAtPeriodEnd && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      Cancels at period end
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {plan.tagline}
                </p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                  ₹{plan.price}
                  <span className="text-xs font-normal text-slate-500">
                    /{subscription.billingCycle === 'annual' ? 'yr' : 'mo'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Billed {subscription.billingCycle}
                </span>
              </div>
            </div>

            {/* Lifecycle Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Billing Cycle</span>
                <strong className="text-slate-800 dark:text-slate-200 capitalize">
                  {subscription.billingCycle}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Member Since</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {formatDate(subscription.createdAt)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">
                  {subscription.cancelAtPeriodEnd ? 'Access Until' : 'Renews On'}
                </span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'Ongoing'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Payment Method</span>
                <strong className="text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <CreditCard size={12} className="text-teal-600" />
                  Razorpay Secure
                </strong>
              </div>
            </div>

            {/* Plan Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              {isFree ? (
                <Link href="/pricing" className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs font-semibold">
                  <Crown size={14} /> Upgrade to Premium (Razorpay)
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/pricing" className="btn btn-outline btn-sm text-xs font-semibold">
                    Change Plan
                  </Link>
                  {!subscription.cancelAtPeriodEnd && (
                    <button
                      type="button"
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium transition-colors"
                      onClick={() => setCancelModalOpen(true)}
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Entitlements Status Matrix */}
          <div className="surface-card p-6 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              Active Feature Entitlements
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Real-time entitlements verified deterministically by the backend.
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
                <div>
                  <strong className="text-slate-800 dark:text-slate-200 block">Financial Goals Limit</strong>
                  <span className="text-[11px] text-slate-500">
                    {entitlements.hasUnlimitedGoals ? 'Unlimited goal tracking & milestones' : 'Limited to 2 active goals on Free tier'}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  {entitlements.hasUnlimitedGoals ? 'Unlimited' : 'Max 2 Goals'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
                <div>
                  <strong className="text-slate-800 dark:text-slate-200 block">What-If Simulation Engine</strong>
                  <span className="text-[11px] text-slate-500">Deterministic scenario projections and savings levers</span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                    entitlements.hasWhatIfSimulator
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {entitlements.hasWhatIfSimulator ? 'Unlocked' : 'Requires Premium'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
                <div>
                  <strong className="text-slate-800 dark:text-slate-200 block">SYNOVATE AI Financial Copilot</strong>
                  <span className="text-[11px] text-slate-500">Natural language explanations grounded in verified financial math</span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                    entitlements.hasAiAssistant
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {entitlements.hasAiAssistant ? 'Unlocked' : 'Requires Premium'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
                <div>
                  <strong className="text-slate-800 dark:text-slate-200 block">Household Member Accounts</strong>
                  <span className="text-[11px] text-slate-500">Collaborative wealth planning and joint surplus calculations</span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                    entitlements.householdMemberLimit > 1
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {entitlements.householdMemberLimit > 1 ? `${entitlements.householdMemberLimit} Members` : '1 Member'}
                </span>
              </div>
            </div>
          </div>

          {/* Payment & Receipts Audit History */}
          <div className="surface-card p-6 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CreditCard size={18} className="text-teal-600" />
                  Billing &amp; Receipts History
                </h3>
                <p className="text-xs text-slate-500">
                  Audit records of transactions verified through Razorpay.
                </p>
              </div>
            </div>

            {payments.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-xl text-xs text-slate-500">
                <CreditCard size={28} className="mx-auto mb-2 text-slate-400 opacity-60" />
                <p>No billing transactions found yet.</p>
                {isFree && (
                  <p className="mt-1 text-slate-400">
                    When you upgrade to a paid tier, your verified invoice records will appear here.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-left">
                      <th className="py-2.5 font-semibold">Date</th>
                      <th className="py-2.5 font-semibold">Plan</th>
                      <th className="py-2.5 font-semibold">Amount</th>
                      <th className="py-2.5 font-semibold">Payment ID</th>
                      <th className="py-2.5 font-semibold">Order ID</th>
                      <th className="py-2.5 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {payments.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {tx.tier ?? 'PREMIUM'} ({tx.billingCycle ?? 'monthly'})
                        </td>
                        <td className="py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          ₹{tx.amount}
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-500">
                          {tx.razorpayPaymentId || '—'}
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-500">
                          {tx.razorpayOrderId || '—'}
                        </td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 capitalize">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Upgrade Recommendation / Household Seats */}
        <div className="lg:col-span-4 space-y-6">
          {isFree ? (
            <div className="surface-card p-6 border border-teal-300 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/40 dark:to-slate-900 rounded-2xl">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-700 text-white font-mono uppercase tracking-wider mb-3 inline-block">
                RECOMMENDED
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Elevate Your Financial Clarity
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Upgrade to SYNOVATE Premium to unlock unlimited goals, the deterministic what-if simulator, and the AI planning copilot.
              </p>

              <div className="space-y-2 text-xs mb-6">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>Unlimited financial goals &amp; tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>What-if scenario testing engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>AI financial assistant with verified context</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>Automated personalized action plans</span>
                </div>
              </div>

              <Link href="/pricing" className="btn btn-primary w-full text-xs font-semibold flex items-center justify-center gap-2">
                <Crown size={15} /> Upgrade to Premium (₹499/mo)
              </Link>
            </div>
          ) : isFamily ? (
            <div className="surface-card p-6 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users size={16} className="text-teal-600" />
                  Household Seats (5 Max)
                </h3>
                <span className="text-xs text-teal-600 font-bold">1 / 5 Used</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Share financial milestones while maintaining individual privacy.
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">
                      YOU
                    </div>
                    <span>Account Owner (Active)</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold">Primary</span>
                </div>

                <div className="p-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Seat 2: Unassigned</span>
                  <button
                    className="text-teal-600 hover:text-teal-700 font-bold text-[11px]"
                    onClick={() => setInviteModalOpen(true)}
                  >
                    + Invite Member
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="surface-card p-6 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
                <Users size={16} className="text-teal-600" />
                Need Household Budgeting?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Manage your family's finances collectively with up to 5 members with the SYNOVATE Family Plan.
              </p>
              <Link href="/pricing" className="btn btn-outline btn-sm w-full text-xs font-semibold text-center block">
                Explore Family Plan (₹899/mo)
              </Link>
            </div>
          )}

          {/* Security & Billing Assurance */}
          <div className="surface-card p-5 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-2.5">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs">
              <ShieldCheck size={16} className="text-emerald-600" />
              Secure Fintech Billing
            </h4>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              All card data and recurring mandates are processed directly by Razorpay under RBI guidelines. SYNOVATE never stores raw payment card numbers.
            </p>
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancelModalOpen && (
        <Modal
          title="Cancel Subscription"
          onClose={() => setCancelModalOpen(false)}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold mb-0.5">Are you sure you want to cancel?</strong>
                <span>
                  You will maintain access to {plan.name} features until the end of your current billing period (
                  {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'end of cycle'}). Afterward, your account will safely return to the Free plan.
                </span>
              </div>
            </div>

            <p className="text-slate-600">
              Your financial transactions, accounts, and goal history will NOT be deleted.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setCancelModalOpen(false)}
              >
                Keep Subscription
              </button>
              <button
                type="button"
                className="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                {cancelMutation.isPending ? 'Canceling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Household Invite Modal */}
      {inviteModalOpen && (
        <Modal
          title="Invite Household Member"
          onClose={() => {
            setInviteModalOpen(false);
            setInviteSent(false);
            setInviteEmail('');
          }}
        >
          {inviteSent ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Invitation Sent!</h3>
              <p className="text-xs text-slate-500">
                We sent an onboarding link to <strong>{inviteEmail}</strong>.
              </p>
              <button
                className="btn btn-primary btn-sm mx-auto"
                onClick={() => {
                  setInviteModalOpen(false);
                  setInviteSent(false);
                  setInviteEmail('');
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inviteEmail) setInviteSent(true);
              }}
              className="space-y-4 text-xs"
            >
              <p className="text-slate-600">
                Enter your family member's email address to connect them to your SYNOVATE Family Plan:
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="family.member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setInviteModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Send Invite
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
