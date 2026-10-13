import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  HelpCircle,
  Info,
  Layers,
  MessageSquare,
  Play,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { Modal } from '@/components/ui-kit';

interface DemoStatusResponse {
  isDemoUser: boolean;
  hasDemoData: boolean;
  syntheticDisclaimer: string;
}

export function DemoPresentationBanner() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [guideOpen, setGuideOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: demoStatus } = useQuery<DemoStatusResponse>({
    queryKey: ['/api/demo/status'],
    queryFn: async () => customFetch<DemoStatusResponse>('/api/demo/status', { method: 'GET' }),
  });

  const loadDemoMutation = useMutation({
    mutationFn: async () => {
      return customFetch('/api/demo/load', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      setStatusMessage('Synthetic demo financial dataset loaded!');
      queryClient.invalidateQueries();
      setTimeout(() => setStatusMessage(null), 4000);
    },
  });

  const steps = [
    {
      step: 1,
      title: 'Step 1: Dashboard Overview',
      subtitle: 'Show financial health and cash flow clarity',
      script: 'Welcome to SYNOVATE. Here we see the whole financial picture at a glance. In this workspace, monthly salary is ₹60,000, fixed and variable expenses total ₹42,000, and available monthly surplus is precisely ₹18,000.',
      actionLabel: 'Go to Dashboard',
      href: '/dashboard',
      icon: Layers,
    },
    {
      step: 2,
      title: 'Step 2: Where the Money Goes',
      subtitle: 'Category distribution & trend analysis',
      script: '“Here is where the user’s money is going.” Food and Housing represent the largest cost drivers, while recurring utilities and subscriptions are tracked deterministically over time.',
      actionLabel: 'Inspect Transactions',
      href: '/transactions',
      icon: FileText,
    },
    {
      step: 3,
      title: 'Step 3: Active Financial Goals',
      subtitle: 'Mathematical feasibility tracking',
      script: '“I want to save ₹2,00,000.” We open the Emergency Fund goal. With ₹50,000 already saved, the remaining ₹1,50,000 across 10 months requires exactly ₹15,000/month. Because the monthly surplus is ₹18,000, this goal is mathematically achievable.',
      actionLabel: 'Open Financial Goals',
      href: '/goals',
      icon: Target,
    },
    {
      step: 4,
      title: 'Step 4: What-If Simulation Sandbox',
      subtitle: 'Decision support without altering ledger data',
      script: '“What happens if I save ₹3,000 more every month?” Instead of guessing, we open the What-If Simulator. The simulation models temporary scenario data without touching real bank records.',
      actionLabel: 'Open Simulator',
      href: '/simulator',
      icon: Compass,
    },
    {
      step: 5,
      title: 'Step 5: Updated Projection Recalculation',
      subtitle: 'Timeline acceleration visualization',
      script: 'Immediately, the simulator recalculates: new monthly surplus becomes ₹21,000/month. The timeline chart dynamically shifts, reaching the ₹2,00,000 milestone nearly 3 months sooner.',
      actionLabel: 'View Dual-Curve Chart',
      href: '/simulator',
      icon: Zap,
    },
    {
      step: 6,
      title: 'Step 6: AI Financial Planning Assistant',
      subtitle: 'Deterministic verified numbers explained clearly',
      script: '“Explain this change to me.” We ask the AI assistant. Crucially, the AI is not a calculation engine—it explains verified deterministic numbers retrieved from the backend.',
      actionLabel: 'Ask AI Assistant',
      href: '/assistant',
      icon: MessageSquare,
    },
    {
      step: 7,
      title: 'Step 7: Personalized Action Plan',
      subtitle: 'Converting analysis into concrete next steps',
      script: 'Next, we look at the Personalized Action Plan. SYNOVATE identifies specific levers: reducing dining out by ₹2,000/mo, auditing recurring subscriptions, and contributing ₹15,000 directly to the emergency reserve.',
      actionLabel: 'Open Action Plan',
      href: '/actions',
      icon: CheckCircle2,
    },
    {
      step: 8,
      title: 'Step 8: Closing Takeaway',
      subtitle: 'The SYNOVATE philosophy',
      script: '“Most apps tell you where your money went. SYNOVATE helps you decide what to do next.”',
      actionLabel: 'Explore Pricing & Monetization',
      href: '/pricing',
      icon: Sparkles,
    },
  ];

  const currentStepData = steps.find((s) => s.step === activeStep) ?? steps[0];

  // Only display demo presentation controls for designated demo users
  if (!demoStatus?.isDemoUser && !demoStatus?.hasDemoData) {
    return null;
  }

  return (
    <>
      <div className="demo-mode-topbar">
        <div className="demo-mode-content">
          <div className="demo-pill-group">
            <span className="demo-badge">
              <Sparkles size={13} /> DEMO MODE
            </span>
            <span className="demo-tagline">
              Synthetic Sandbox · Income: ₹60k | Expenses: ₹42k | Surplus: ₹18k
            </span>
          </div>

          <div className="demo-topbar-actions">
            {statusMessage && <span className="demo-status-msg">{statusMessage}</span>}
            <button
              className="btn-demo-action"
              disabled={loadDemoMutation.isPending}
              onClick={() => loadDemoMutation.mutate()}
              title="Reset synthetic demo records"
            >
              <RefreshCw size={13} className={loadDemoMutation.isPending ? 'spin' : ''} />
              {loadDemoMutation.isPending ? 'Loading Demo Data…' : 'Load Demo Data'}
            </button>
            <button
              className="btn-demo-presentation"
              onClick={() => setGuideOpen(true)}
            >
              <PlayCircle size={14} /> 3-Min Demo Flow
            </button>
          </div>
        </div>
      </div>

      {/* 3-Minute Demo Presentation Guide Modal */}
      {guideOpen && (
        <Modal
          title="SYNOVATE · 3-Minute Hackathon Demo Guide"
          onClose={() => setGuideOpen(false)}
        >
          <div className="demo-guide-container">
            {/* Step Navigation Progress */}
            <div className="guide-progress-bar">
              {steps.map((s) => (
                <button
                  key={s.step}
                  className={`guide-progress-dot ${s.step === activeStep ? 'active' : s.step < activeStep ? 'done' : ''}`}
                  onClick={() => setActiveStep(s.step)}
                  title={`Step ${s.step}: ${s.title}`}
                >
                  {s.step}
                </button>
              ))}
            </div>

            {/* Current Slide Content */}
            <div className="guide-slide-card">
              <div className="guide-slide-header">
                <span className="slide-step-counter">STEP {currentStepData.step} OF 8</span>
                <span className="slide-icon">
                  <currentStepData.icon size={22} />
                </span>
              </div>

              <h2 className="guide-slide-title">{currentStepData.title}</h2>
              <p className="guide-slide-subtitle">{currentStepData.subtitle}</p>

              <div className="guide-presenter-speech">
                <div className="speech-caption">PRESENTER SCRIPT:</div>
                <blockquote>“{currentStepData.script}”</blockquote>
              </div>

              <div className="guide-slide-actions">
                <button
                  className="btn-jump-action"
                  onClick={() => {
                    setLocation(currentStepData.href);
                    setGuideOpen(false);
                  }}
                >
                  {currentStepData.actionLabel} <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="guide-footer-controls">
              <button
                className="guide-nav-btn"
                disabled={activeStep === 1}
                onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
              >
                <ChevronLeft size={16} /> Previous Step
              </button>
              <span className="guide-step-indicator">
                {activeStep} / {steps.length}
              </span>
              <button
                className="guide-nav-btn primary"
                disabled={activeStep === steps.length}
                onClick={() => setActiveStep((prev) => Math.min(steps.length, prev + 1))}
              >
                Next Step <ChevronRight size={16} />
              </button>
            </div>

            <div className="guide-closing-callout">
              <Sparkles size={14} />
              <span>
                <strong>Hackathon Pitchline:</strong> “Most apps tell you where your money went. SYNOVATE helps you decide what to do next.”
              </span>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
