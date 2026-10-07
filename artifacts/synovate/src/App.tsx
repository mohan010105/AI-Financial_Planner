import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppLayout } from '@/components/app-layout';
import { getGetAuthSessionQueryKey, useGetAuthSession } from '@workspace/api-client-react';
import { ErrorState, Loading } from '@/components/ui-kit';
import DashboardPage from '@/pages/dashboard';
import TransactionsPage from '@/pages/transactions';
import { AssistantPage, GoalsPage, LoginPage, RegisterPage, SettingsPage, SimulatorPage } from '@/pages/placeholders';
import FinancialProfilePage from '@/pages/financial-profile';
import NotFound from '@/pages/not-found';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } });
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function Router() {
  const [location] = useLocation();
  const session = useGetAuthSession({
    query: {
      queryKey: getGetAuthSessionQueryKey(),
      retry: false,
      staleTime: 0,
      refetchOnMount: 'always',
    },
  });
  const isPublicRoute = location === '/login' || location === '/register';

  if (session.isLoading) return <div className="session-gate"><Loading label="Checking your session" /></div>;
  if (session.isError) return <div className="session-gate"><ErrorState onRetry={() => { void session.refetch(); }} /></div>;
  if (!session.data?.authenticated && !isPublicRoute) return <Redirect to="/login" />;
  if (session.data?.authenticated && isPublicRoute) {
    return <Redirect to={session.data.user?.hasFinancialProfile ? '/dashboard' : '/profile'} />;
  }

  return <RoutedErrorBoundary><AppLayout user={session.data?.user ?? null}><Switch>
    <Route path="/" component={DashboardPage} />
    <Route path="/dashboard" component={DashboardPage} />
    <Route path="/login" component={LoginPage} />
    <Route path="/register" component={RegisterPage} />
    <Route path="/profile" component={FinancialProfilePage} />
    <Route path="/transactions" component={TransactionsPage} />
    <Route path="/goals" component={GoalsPage} />
    <Route path="/simulator" component={SimulatorPage} />
    <Route path="/assistant" component={AssistantPage} />
    <Route path="/settings" component={SettingsPage} />
    <Route component={NotFound} />
  </Switch></AppLayout></RoutedErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter></TooltipProvider></QueryClientProvider>;
}
export default App;
