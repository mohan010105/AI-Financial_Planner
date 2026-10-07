import { useLocation, Link } from 'wouter';
import { ArrowLeft, ArrowRight, LockKeyhole, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  getGetAuthSessionQueryKey, useLoginUser, useRegisterUser, useGetProfileModuleStatus,
  useGetGoalsStatus, useGetSimulatorStatus, useGetAssistantStatus,
  type CredentialsInput,
} from '@workspace/api-client-react';
import {
  getGetProfileModuleStatusQueryKey, getGetGoalsStatusQueryKey,
  getGetSimulatorStatusQueryKey, getGetAssistantStatusQueryKey,
} from '@workspace/api-client-react';
import { Button, Card, ErrorState, Input, Loading } from '@/components/ui-kit';
import { Form } from '@/components/ui/form';

type ModuleName = 'auth' | 'profile' | 'goals' | 'simulator' | 'assistant';
type StatusData = { module: string; phase: number; status: string } | undefined;
type StatusProps = { data: StatusData; isLoading: boolean; isError: boolean; refetch: () => unknown };

function StatusPanel({ data, isLoading, isError, refetch }: StatusProps) {
  return <Card className="module-status-card">
    <div className="status-card-top"><div><span className="chart-kicker">LIVE MODULE STATUS</span><h2>Phase 1 availability</h2></div><span className="phase-pill">PHASE 1</span></div>
    {isLoading ? <Loading label="Loading module availability" /> : isError ? <ErrorState onRetry={() => { void refetch(); }} /> : <div className="availability-row" data-testid={`status-${data?.module ?? 'module'}`}><span className="availability-indicator" /><div className="availability-copy"><strong>{data?.status === 'placeholder' ? 'Module placeholder available' : 'Status received'}</strong><span>The API confirms this module is present in the Phase 1 workspace.</span></div><div className="status-values"><span>{data?.module}</span><b>{data?.status}</b></div></div>}
    <div className="status-card-note"><LockKeyhole size={14} /><span>This status is an availability marker only. No profile or financial user data API is available yet.</span></div>
  </Card>;
}

const moduleDetails: Record<ModuleName, { title: string; subtitle: string; eyebrow: string; description: string; icon: string }> = {
  auth: { title: 'A calmer place to see the whole picture.', subtitle: 'Welcome back', eyebrow: 'YOUR FINANCIAL WORKSPACE', description: 'A personal space to understand your money clearly and make decisions on your terms.', icon: 'Access' },
  profile: { title: 'Your details, when you’re ready.', subtitle: 'Profile', eyebrow: 'YOUR SPACE', description: 'Your financial profile is private to your account and can be updated at any time.', icon: 'Profile' },
  goals: { title: 'Make room for what matters to you.', subtitle: 'Goals', eyebrow: 'YOUR PRIORITIES', description: 'Your financial goals will have a home here. No goal tracking or calculations are active yet.', icon: 'Goals' },
  simulator: { title: 'Explore possibilities at your pace.', subtitle: 'Simulator', eyebrow: 'THINK AHEAD', description: 'A planning canvas for future scenarios is on the roadmap. No calculations or recommendations are available.', icon: 'Simulator' },
  assistant: { title: 'A thoughtful companion for your questions.', subtitle: 'AI assistant', eyebrow: 'A DIFFERENT KIND OF CLARITY', description: 'The assistant experience is a future placeholder. AI responses and recommendations are not enabled.', icon: 'Assistant' },
};

function ModulePage({ module, data, isLoading, isError, refetch }: { module: ModuleName } & StatusProps) {
  const detail = moduleDetails[module];
  return <div className="placeholder-page">
    <div className="placeholder-header"><div className="eyebrow">{detail.eyebrow}<span className="eyebrow-line" /></div><div className="placeholder-title-row"><div><h1>{detail.subtitle}</h1><p>{detail.description}</p></div><span className="placeholder-icon"><Sparkles size={19} /></span></div></div>
    <div className="placeholder-layout"><div className="placeholder-main">
      <StatusPanel data={data} isLoading={isLoading} isError={isError} refetch={refetch} />
      <Card className="roadmap-card"><div className="roadmap-icon"><span>01</span></div><div><span className="chart-kicker">FOUNDATION IN PROGRESS</span><h2>{detail.title}</h2><p>This space is intentionally quiet for now. The foundation is in place; personal data and module capabilities will arrive in a later phase.</p></div></Card>
      <div className="phase-explainer"><span className="phase-marker" /><p><strong>Phase 1 · Workspace foundation</strong><br />Navigation and service availability are in place. This screen does not display or change financial information.</p></div>
    </div><aside className="placeholder-aside"><span className="chart-kicker">SYNOVATE PRINCIPLE</span><div className="principle-quote">“Understand first.<br /><em>Choose for yourself.</em>”</div><p>A personal financial workspace should bring clarity, not make choices on your behalf.</p><div className="aside-rule" /><div className="aside-bottom"><span>BUILT AROUND YOU</span><span>01 / 03</span></div></aside></div>
  </div>;
}

export function GoalsPage() {
  const query = useGetGoalsStatus({ query: { queryKey: getGetGoalsStatusQueryKey() } });
  return <ModulePage module="goals" data={query.data} isLoading={query.isLoading} isError={query.isError} refetch={query.refetch} />;
}
export function SimulatorPage() {
  const query = useGetSimulatorStatus({ query: { queryKey: getGetSimulatorStatusQueryKey() } });
  return <ModulePage module="simulator" data={query.data} isLoading={query.isLoading} isError={query.isError} refetch={query.refetch} />;
}
export function AssistantPage() {
  const query = useGetAssistantStatus({ query: { queryKey: getGetAssistantStatusQueryKey() } });
  return <ModulePage module="assistant" data={query.data} isLoading={query.isLoading} isError={query.isError} refetch={query.refetch} />;
}
export function SettingsPage() {
  const query = useGetProfileModuleStatus({ query: { queryKey: getGetProfileModuleStatusQueryKey() } });
  return <ModulePage module="profile" data={query.data} isLoading={query.isLoading} isError={query.isError} refetch={query.refetch} />;
}

export function LoginPage() {
  return <AuthForm mode="login" />;
}
export function RegisterPage() {
  return <AuthForm mode="register" />;
}
type AuthFormValues = CredentialsInput & { confirmPassword: string };

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const register = mode === 'register';
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const form = useForm<AuthFormValues>({
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });
  const login = useLoginUser();
  const createAccount = useRegisterUser();
  const activeMutation = register ? createAccount : login;
  const busy = activeMutation.isPending;

  function onSubmit(values: AuthFormValues): void {
    const credentials = { email: values.email.trim(), password: values.password };
    const options = {
      onSuccess: (session: { authenticated: boolean; user: { hasFinancialProfile: boolean } | null }) => {
        queryClient.setQueryData(getGetAuthSessionQueryKey(), session);
        setLocation(register || !session.user?.hasFinancialProfile ? '/profile' : '/dashboard');
      },
    };
    if (register) createAccount.mutate({ data: credentials }, options);
    else login.mutate({ data: credentials }, options);
  }

  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;
  const confirmPasswordError = form.formState.errors.confirmPassword?.message;
  const requestError = activeMutation.error?.message;

  return <div className="auth-page"><div className="auth-decoration"><div className="auth-wordmark"><span className="brand-symbol"><Sparkles size={19} /></span>SYNOVATE<span className="brand-period">.</span></div><div className="auth-statement"><span className="chart-kicker">A PERSONAL FINANCIAL WORKSPACE</span><h1>{register ? 'Start with a clearer view.' : 'Your money, in perspective.'}</h1><p>Understand your finances clearly. Make your own decisions.</p><div className="auth-decoration-lines"><i /><i /><i /></div><div className="auth-footnote"><span>01</span><span>Clarity, without the noise.</span></div></div></div>
    <div className="auth-form-side"><Link href={register ? '/login' : '/register'} className="auth-back" data-testid="link-auth-alternate"><ArrowLeft size={15} /> {register ? 'Back to sign in' : 'Create an account'}</Link><Card className="auth-card"><span className="chart-kicker">{register ? 'A PLACE OF YOUR OWN' : 'WELCOME BACK'}</span><h2>{register ? 'Create your workspace' : 'Sign in to SYNOVATE'}</h2><p className="auth-subtext">{register ? 'A thoughtful way to get to know your money.' : 'Your personal financial workspace, at a glance.'}</p>
      <Form {...form}>
        <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="auth-fields">
            <Input label="Email address" type="email" autoComplete="email" placeholder="you@example.com" maxLength={320} disabled={busy} data-testid="input-auth-email" aria-invalid={!!emailError} {...form.register('email', { required: 'Enter your email address.', maxLength: 320, pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address.' } })} />
            {emailError && <p className="field-error" role="alert" data-testid="error-auth-email">{emailError}</p>}
            <Input label="Password" type="password" autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'At least 12 characters' : 'Enter your password'} minLength={register ? 12 : undefined} maxLength={128} disabled={busy} data-testid="input-auth-password" aria-invalid={!!passwordError} {...form.register('password', { required: 'Enter your password.', minLength: register ? { value: 12, message: 'Use at least 12 characters.' } : undefined, maxLength: { value: 128, message: 'Password is too long.' } })} />
            {passwordError && <p className="field-error" role="alert" data-testid="error-auth-password">{passwordError}</p>}
            {register && <>
              <Input label="Confirm password" type="password" autoComplete="new-password" placeholder="Re-enter your password" maxLength={128} disabled={busy} data-testid="input-auth-confirm-password" aria-invalid={!!confirmPasswordError} {...form.register('confirmPassword', { required: 'Confirm your password.', validate: (value) => value === form.getValues('password') || 'Passwords do not match.' })} />
              {confirmPasswordError && <p className="field-error" role="alert" data-testid="error-auth-confirm-password">{confirmPasswordError}</p>}
            </>}
          </div>
          {requestError && <p className="form-error" role="alert" data-testid="error-auth-request">{requestError}</p>}
          <Button className="auth-submit" type="submit" disabled={busy} data-testid={`button-${mode}`}>{busy ? 'Please wait…' : register ? 'Create account' : 'Continue'} {!busy && <ArrowRight size={16} />}</Button>
        </form>
      </Form>
      <p className="auth-disabled-note"><LockKeyhole size={13} /> Passwords are stored as one-way hashes; sessions stay on the server.</p>
      <div className="auth-switch">{register ? 'Already have a workspace?' : 'New to SYNOVATE?'} <Link href={register ? '/login' : '/register'} data-testid={`link-${register ? 'login' : 'register'}`}>{register ? 'Sign in' : 'Create an account'}</Link></div>
    </Card><p className="auth-copyright">© 2026 SYNOVATE · A clearer way forward.</p></div></div>;
}
