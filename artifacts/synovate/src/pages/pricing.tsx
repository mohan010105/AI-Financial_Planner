import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';
import {
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Code2,
  Crown,
  HelpCircle,
  Info,
  Lock,
  Minus,
  RefreshCw,
  Rocket,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from 'wouter';
import { Card, Loading } from '@/components/ui-kit';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export type SubscriptionTier = 'FREE' | 'PREMIUM' | 'FAMILY';

export interface PlanEntitlements {
  maxGoals: number | null;
  hasUnlimitedGoals: boolean;
  hasWhatIfSimulator: boolean;
  hasAiAssistant: boolean;
  hasActionPlan: boolean;
  hasAdvancedAnalytics: boolean;
  hasAdvancedReports: boolean;
  householdMemberLimit: number;
  hasB2BWellnessAccess: boolean;
  hasEnterpriseApiAccess: boolean;
}

export interface PlanDefinition {
  id: string;
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  billingCycle?: 'monthly' | 'annual';
  price: number;
  currency: string;
  badge?: string;
  features: string[];
  entitlements: PlanEntitlements;
}

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'annual';
  status: string;
  razorpaySubscriptionId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSubscriptionResponse {
  subscription: UserSubscription;
  plan: PlanDefinition;
  entitlements: PlanEntitlements;
  keyId?: string;
}

export interface BillingPlansResponse {
  plans: PlanDefinition[];
}

export default function PricingPage() {
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutLoadingTier, setCheckoutLoadingTier] = useState<string | null>(null);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);

  // Fetch current user subscription state
  const { data: subData, isLoading: isSubLoading } = useQuery<BillingSubscriptionResponse>({
    queryKey: ['/api/billing/subscription'],
    queryFn: async () => customFetch<BillingSubscriptionResponse>('/api/billing/subscription', { method: 'GET' }),
  });

  // Fetch verified billing plans
  const { data: plansData, isLoading: isPlansLoading } = useQuery<BillingPlansResponse>({
    queryKey: ['/api/billing/plans'],
    queryFn: async () => customFetch<BillingPlansResponse>('/api/billing/plans', { method: 'GET' }),
  });

  const handleCheckout = async (tier: SubscriptionTier) => {
    setPaymentErrorMessage(null);
    setPaymentSuccessMessage(null);

    if (tier === 'FREE') {
      // Switching to Free is handled by cancellation flow
      return;
    }

    if (typeof window === 'undefined' || !window.Razorpay) {
      setPaymentErrorMessage('Razorpay Checkout SDK is still loading. Please refresh and try again.');
      return;
    }

    setCheckoutLoadingTier(tier);

    try {
      // 1. Request secure checkout order from backend
      const checkoutOrder = await customFetch<{
        keyId: string;
        orderId: string;
        amount: number;
        currency: string;
        tier: SubscriptionTier;
        billingCycle: 'monthly' | 'annual';
        planName: string;
        price: number;
      }>('/api/billing/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billingCycle }),
      });

      if (!checkoutOrder.orderId) {
        throw new Error('Server could not initialize checkout order.');
      }

      // 2. Configure official Razorpay Checkout modal
      const options = {
        key: checkoutOrder.keyId,
        amount: checkoutOrder.amount,
        currency: checkoutOrder.currency,
        name: 'SYNOVATE',
        description: `${checkoutOrder.planName} (${billingCycle === 'annual' ? 'Annual' : 'Monthly'})`,
        order_id: checkoutOrder.orderId,
        theme: {
          color: '#0d9488',
        },
        modal: {
          ondismiss: () => {
            setCheckoutLoadingTier(null);
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setCheckoutLoadingTier('verifying');
            // 3. Cryptographically verify signature on backend
            const verifyResult = await customFetch<{
              success: boolean;
              message: string;
              subscription: UserSubscription;
            }>('/api/billing/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                tier,
                billingCycle,
              }),
            });

            if (verifyResult.success) {
              setPaymentSuccessMessage(`Payment verified successfully! Welcome to SYNOVATE ${tier}!`);
              void queryClient.invalidateQueries({ queryKey: ['/api/billing/subscription'] });
              void queryClient.invalidateQueries({ queryKey: ['/api/billing/payments'] });
              void queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
              void queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
            }
          } catch (err: any) {
            setPaymentErrorMessage(err.message || 'Payment signature verification failed. Please contact support.');
          } finally {
            setCheckoutLoadingTier(null);
          }
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', (failedRes: any) => {
        setPaymentErrorMessage(`Payment failed: ${failedRes.error?.description || 'Transaction unsuccessful'}`);
        setCheckoutLoadingTier(null);
      });
      razorpayInstance.open();
    } catch (err: any) {
      setPaymentErrorMessage(err.message || 'Could not start checkout session.');
      setCheckoutLoadingTier(null);
    }
  };

  if (isSubLoading || isPlansLoading || !subData) {
    return (
      <div className="page-content page-enter">
        <div className="page-intro">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              <span>SUBSCRIPTION PLANS & BILLING</span>
            </div>
            <h1>
              Plans & <em>Entitlements</em>
            </h1>
          </div>
        </div>
        <Card className="p-12">
          <Loading label="Loading verified billing plans from server..." />
        </Card>
      </div>
    );
  }

  const currentTier = subData.subscription.tier;

  const displayPlans = [
    {
      id: 'FREE',
      tier: 'FREE' as SubscriptionTier,
      name: 'Free',
      tagline: 'Essential financial tracking for individuals',
      monthlyPrice: 0,
      annualPrice: 0,
      badge: undefined,
      features: [
        'Basic financial dashboard',
        'Categorized transaction tracking & CSV import',
        'Up to 2 financial goals',
        'Standard monthly analytics & ratios',
        'Transparent health indicators',
      ],
    },
    {
      id: 'PREMIUM',
      tier: 'PREMIUM' as SubscriptionTier,
      name: 'Premium',
      tagline: 'Complete financial decision-support and intelligence',
      monthlyPrice: 499,
      annualPrice: 4999,
      badge: 'MOST POPULAR',
      features: [
        'Everything in Free',
        'Unlimited financial goals & milestone planning',
        'Deterministic What-If Financial Simulation Engine',
        'SYNOVATE AI Financial Planning Copilot',
        'Personalized Financial Action Plan & monthly summaries',
        'Advanced cash flow analytics & exportable reports',
      ],
    },
    {
      id: 'FAMILY',
      tier: 'FAMILY' as SubscriptionTier,
      name: 'Family',
      tagline: 'Collaborative wealth planning for household members',
      monthlyPrice: 899,
      annualPrice: 8999,
      badge: 'HOUSEHOLD',
      features: [
        'Everything in Premium',
        'Up to 5 synchronized household member accounts',
        'Consolidated household cash flow & net worth',
        'Shared family goals with individual privacy controls',
        'Collective surplus & emergency fund optimization',
      ],
    },
  ];

  return (
    <div className="page-content page-enter space-y-8">
      {/* Page Header */}
      <div className="page-intro text-center max-w-2xl mx-auto">
        <div className="eyebrow justify-center">
          <span className="eyebrow-line" />
          <span>FINANCIAL DECISION-SUPPORT PLATFORM PRICING</span>
          <span className="eyebrow-line" />
        </div>
        <h1 className="text-3xl font-bold mt-1">
          Transparent Plans for <em>Every Stage of Wealth</em>
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm mt-2">
          Positioned as a conflict-free financial decision support platform. We charge for powerful software, not commissions on investments.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="inline-flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mt-6 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              billingCycle === 'annual'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            onClick={() => setBillingCycle('annual')}
          >
            <span>Annual Billing</span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {paymentSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-100 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <span>{paymentSuccessMessage}</span>
          </div>
          <Link href="/settings/subscription" className="text-xs font-bold underline">
            Manage Subscription →
          </Link>
        </div>
      )}

      {/* Error Banner */}
      {paymentErrorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-100 text-sm flex items-center gap-3">
          <ShieldAlert size={20} className="text-rose-600" />
          <span>{paymentErrorMessage}</span>
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayPlans.map((plan) => {
          const isCurrent = currentTier === plan.tier;
          const isPopular = plan.tier === 'PREMIUM';
          const price = billingCycle === 'annual' ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
          const isCheckingOut = checkoutLoadingTier === plan.tier;

          return (
            <div
              key={plan.id}
              className={`surface-card p-6 border rounded-2xl relative flex flex-col justify-between transition-all ${
                isPopular
                  ? 'border-teal-500 dark:border-teal-400 shadow-xl ring-2 ring-teal-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-teal-700 text-white font-mono text-[10px] font-bold tracking-wider">
                  {plan.badge}
                </span>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {plan.name}
                  </h3>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      CURRENT PLAN
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[32px] mb-4">
                  {plan.tagline}
                </p>

                {/* Price Display */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                      ₹{new Intl.NumberFormat().format(price)}
                    </span>
                    <span className="text-xs text-slate-500">
                      / month
                    </span>
                  </div>
                  {billingCycle === 'annual' && plan.annualPrice > 0 && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
                      Billed ₹{new Intl.NumberFormat().format(plan.annualPrice)} annually
                    </span>
                  )}
                  {plan.monthlyPrice === 0 && (
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Free forever, no card required
                    </span>
                  )}
                </div>

                {/* Feature Checklist */}
                <div className="space-y-2.5 text-xs mb-8 border-t border-slate-100 dark:border-slate-800 pt-5">
                  {plan.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5">
                      <CheckCircle2 size={15} className="text-teal-600 shrink-0 mt-0.5" />
                      <span className="text-slate-700 dark:text-slate-300 leading-snug">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isCurrent ? (
                  <button
                    type="button"
                    className="w-full btn btn-outline btn-md opacity-75 cursor-default text-xs"
                    disabled
                  >
                    Active Plan
                  </button>
                ) : plan.tier === 'FREE' ? (
                  <Link
                    href="/settings/subscription"
                    className="w-full btn btn-outline btn-md text-xs font-semibold text-center block"
                  >
                    Manage Downgrade
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={`w-full btn btn-md text-xs font-semibold ${
                      isPopular ? 'btn-primary' : 'btn-outline'
                    }`}
                    onClick={() => handleCheckout(plan.tier)}
                    disabled={Boolean(checkoutLoadingTier)}
                  >
                    {isCheckingOut ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin" /> Processing...
                      </span>
                    ) : (
                      `Upgrade to ${plan.name} (Razorpay)`
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Matrix Table */}
      <div className="surface-card p-6 border border-slate-200 dark:border-slate-800">
        <div className="mb-4">
          <span className="chart-kicker block mb-1">ENTITLEMENT COMPARISON</span>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Feature Entitlement Matrix
          </h3>
          <p className="text-xs text-slate-500">
            Compare backend-enforced capabilities between subscription tiers.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-3 text-left font-semibold">Capability</th>
                <th className="py-3 text-center font-semibold">Free</th>
                <th className="py-3 text-center font-semibold text-teal-700 dark:text-teal-300 font-bold">Premium</th>
                <th className="py-3 text-center font-semibold">Family</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="py-3 font-medium text-slate-800 dark:text-slate-200">Basic Dashboard & Cash Flow</td>
                <td className="py-3 text-center"><Check size={16} className="text-emerald-600 mx-auto" /></td>
                <td className="py-3 text-center"><Check size={16} className="text-emerald-600 mx-auto" /></td>
                <td className="py-3 text-center"><Check size={16} className="text-emerald-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-800 dark:text-slate-200">Transaction Tracking & CSV Upload</td>
                <td className="py-3 text-center"><Check size={16} className="text-emerald-600 mx-auto" /></td>
                <td className="py-3 text-center"><Check size={16} className="text-emerald-600 mx-auto" /></td>
                <td className="py-3 text-center"><Check size={16} className="text-emerald-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-800 dark:text-slate-200">Financial Goals Tracking</td>
                <td className="py-3 text-center text-slate-600">Up to 2 Goals</td>
                <td className="py-3 text-center text-teal-700 dark:text-teal-300 font-bold">Unlimited</td>
                <td className="py-3 text-center font-bold">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-800 dark:text-slate-200">What-If Simulation Engine</td>
                <td className="py-3 text-center"><Minus size={16} className="text-slate-300 mx-auto" /></td>
                <td className="py-3 text-center"><Check size={16} className="text-emerald-600 mx-auto" /></td>
                <td className="py-3 text-center"><Check size={16} className="text-emerald-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-800 dark:text-slate-200">AI Financial Planning Assistant</td>
                <td className="py-3 text-center"><Minus size={16} className="text-slate-300 mx-auto" /></td>
                <td className="py-3 text-center"><Check size={16} className="text-emerald-600 mx-auto" /></td>
                <td className="py-3 text-center"><Check size={16} className="text-emerald-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-800 dark:text-slate-200">Personalized Action Plan</td>
                <td className="py-3 text-center"><Minus size={16} className="text-slate-300 mx-auto" /></td>
                <td className="py-3 text-center"><Check size={16} className="text-emerald-600 mx-auto" /></td>
                <td className="py-3 text-center"><Check size={16} className="text-emerald-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-800 dark:text-slate-200">Household Member Workspaces</td>
                <td className="py-3 text-center text-slate-600">1 Member</td>
                <td className="py-3 text-center text-slate-600">1 Member</td>
                <td className="py-3 text-center text-indigo-700 dark:text-indigo-300 font-bold">Up to 5 Members</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-800 dark:text-slate-200">Advanced Analytics & Report Exports</td>
                <td className="py-3 text-center"><Minus size={16} className="text-slate-300 mx-auto" /></td>
                <td className="py-3 text-center"><Check size={16} className="text-emerald-600 mx-auto" /></td>
                <td className="py-3 text-center"><Check size={16} className="text-emerald-600 mx-auto" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
