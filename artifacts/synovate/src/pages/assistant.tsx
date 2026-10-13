import { CheckCircle2, Crown, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';
import { AssistantChat } from '@/components/assistant-chat';
import type { BillingSubscriptionResponse } from './pricing';

export default function AssistantPage() {
  const { data: subData } = useQuery<BillingSubscriptionResponse>({
    queryKey: ['/api/billing/subscription'],
    queryFn: async () => customFetch<BillingSubscriptionResponse>('/api/billing/subscription', { method: 'GET' }),
  });

  const isFree = subData?.subscription?.tier === 'FREE';

  return (
    <div className="page-content page-enter">
      {/* Page Header */}
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            <span>AI FINANCIAL COPILOT · EXPLANATION LAYER</span>
          </div>
          <h1>
            Your Financial <em>Copilot</em>
          </h1>
          <p>
            Ask questions about your finances and explore your options.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Embedded Chat Box (Left/Center) */}
        <div className="lg:col-span-8">
          <AssistantChat embedded />
        </div>

        {/* Informational Side Panel (Right) */}
        <div className="lg:col-span-4 space-y-4">
          {isFree && (
            <div className="surface-card p-5 border border-teal-300 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/40 dark:to-slate-900 rounded-xl">
              <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 font-bold text-xs mb-1.5">
                <Crown size={15} />
                <span>PREMIUM FEATURE</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                The AI Financial Planning Copilot requires an active Premium plan. Upgrade now to enable full AI interactive explanations.
              </p>
              <Link href="/pricing" className="btn btn-primary btn-sm w-full text-xs font-semibold flex items-center justify-center gap-1.5">
                <Crown size={14} /> Upgrade to Premium (₹499/mo)
              </Link>
            </div>
          )}

          <div className="surface-card p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <ShieldCheck size={17} className="text-emerald-600" />
              Verified Architecture
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
              SYNOVATE AI operates strictly as an explanation layer. It does not perform financial math independently.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                <CheckCircle2 size={15} className="text-teal-600 shrink-0 mt-0.5" />
                <span>All numbers are calculated deterministically by backend services.</span>
              </div>
              <div className="flex items-start gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                <CheckCircle2 size={15} className="text-teal-600 shrink-0 mt-0.5" />
                <span>Financial data and transaction records are never fabricated.</span>
              </div>
              <div className="flex items-start gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                <CheckCircle2 size={15} className="text-teal-600 shrink-0 mt-0.5" />
                <span>API keys are secured on the backend and never exposed to the client.</span>
              </div>
            </div>
          </div>

          <div className="surface-card p-5 bg-gradient-to-br from-teal-900 to-slate-900 text-white">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-2">
              <Sparkles size={16} />
              Supported Queries
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ask about your top spending categories, savings rate drops, goal completion estimates, or scenario projections.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
