import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useLogoutUser, type SessionUser } from '@workspace/api-client-react';
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  CircleHelp,
  Compass,
  CreditCard,
  Crown,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  X,
} from 'lucide-react';
import { Modal } from '@/components/ui-kit';
import { AssistantChat } from '@/components/assistant-chat';
import { DemoPresentationBanner } from '@/components/demo-presentation-banner';

// Section 3: Navigation structure
const navGroups = [
  {
    label: 'WORKSPACE',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Transactions', href: '/transactions', icon: CreditCard },
      { label: 'Financial Insights', href: '/insights', icon: BarChart3 },
      { label: 'Goals', href: '/goals', icon: Target },
      { label: 'What-If Simulator', href: '/simulator', icon: Compass },
      { label: 'AI Financial Assistant', href: '/assistant', icon: Sparkles },
      { label: 'Action Plan', href: '/actions', icon: CheckSquare },
    ],
  },
  {
    label: 'PREFERENCES',
    items: [
      { label: 'Profile', href: '/profile', icon: UserRound },
      { label: 'Subscription', href: '/settings/subscription', icon: Crown },
      { label: 'Plans & Pricing', href: '/pricing', icon: Sparkles },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

const pageTitles: Record<string, string> = {
  '/': 'Overview',
  '/dashboard': 'Overview',
  '/login': 'Welcome back',
  '/register': 'Create your workspace',
  '/profile': 'Financial Profile',
  '/insights': 'Financial Insights',
  '/transactions': 'Transactions',
  '/goals': 'Financial Goals',
  '/simulator': 'What-If Simulator',
  '/assistant': 'AI Financial Assistant',
  '/actions': 'Action Plan',
  '/action-plan': 'Action Plan',
  '/pricing': 'Plans & Pricing',
  '/settings/subscription': 'Subscription Status',
  '/subscription': 'Subscription Status',
  '/settings': 'Settings',
};

// Clean geometric financial-growth SVG mark
function BrandLogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 17L9 11L13 15L21 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 7H21V12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="11" r="1.5" fill="currentColor" />
      <circle cx="13" cy="15" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function AppLayout({ children, user }: { children: ReactNode; user: SessionUser | null }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const queryClient = useQueryClient();
  const logout = useLogoutUser();
  const title = pageTitles[location] ?? 'Workspace';
  const initials = user?.displayName
    ? user.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    : user?.email.slice(0, 2).toUpperCase() ?? '?';

  const todayDateString = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  function handleLogout(): void {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        setLocation('/login');
      },
    });
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        {/* Brand row */}
        <div className="brand-row">
          <Link href="/dashboard" className="brand-link" data-testid="link-brand">
            <span className="brand-symbol">
              <BrandLogoIcon />
            </span>
            <span>
              SYNOVATE<span className="brand-period">.</span>
            </span>
          </Link>
          <button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X size={19} />
          </button>
        </div>

        {/* Workspace context chip */}
        <div className="workspace-chip">
          <span className="workspace-avatar">S</span>
          <span>
            <strong>Personal Workspace</strong>
            <small>{user ? 'Deterministic Ledger' : 'Sign-in required'}</small>
          </span>
          <ChevronDown size={14} />
        </div>

        {/* Main navigation */}
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-caption">{group.label}</p>
              {group.items.map(({ label, href, icon: Icon }) => {
                const active = location === href || (href === '/dashboard' && location === '/');
                return (
                  <Link
                    href={href}
                    key={href}
                    className={`nav-link ${active ? 'nav-link-active' : ''}`}
                    data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                    <span>{label}</span>
                    {label === 'What-If Simulator' && <span className="nav-soon">PRO</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom section (Settings, Help, User profile, Subscription status) */}
        <div className="sidebar-bottom">
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button
              className="btn btn-outline btn-sm"
              style={{ flex: 1, fontSize: 10, background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
              onClick={() => setHelpOpen(true)}
              data-testid="button-sidebar-help"
            >
              <HelpCircle size={13} style={{ color: '#34d399' }} /> Help & Guide
            </button>
            <Link
              href="/settings/subscription"
              className="btn btn-outline btn-sm"
              style={{ fontSize: 10, background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#cbd5e1', textDecoration: 'none' }}
              data-testid="link-sidebar-subscription"
            >
              <Crown size={13} style={{ color: '#f59e0b' }} /> Plan
            </Link>
          </div>

          <div className="sidebar-user">
            <div className="user-initials" data-testid="text-user-avatar">
              {initials}
            </div>
            <div className="user-copy">
              <strong data-testid="text-user-name">{user?.displayName ?? (user ? 'Your Profile' : 'Sign in')}</strong>
              <small data-testid="text-user-email">{user?.email ?? 'Account access'}</small>
            </div>
            <Link href={user ? '/profile' : '/login'} className="user-menu icon-button" aria-label={user ? 'Open profile' : 'Sign in'} data-testid="link-account-menu">
              <ChevronDown size={15} />
            </Link>
            {user && (
              <button
                className="user-menu icon-button"
                type="button"
                aria-label="Log out"
                title="Log out"
                data-testid="button-logout"
                disabled={logout.isPending}
                onClick={handleLogout}
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
          {logout.error && (
            <p className="sidebar-user-error" role="alert" data-testid="error-logout">
              {logout.error.message}
            </p>
          )}
        </div>
      </aside>

      {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}

      {/* Main column */}
      <div className="main-column">
        <DemoPresentationBanner />

        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              data-testid="button-open-navigation"
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumbs">
              <span>SYNOVATE</span>
              <span className="crumb-separator">/</span>
              <strong>{title}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <span className="topbar-date">{todayDateString}</span>

            {/* Contextual Topbar Action */}
            {location === '/transactions' && (
              <Link href="/transactions" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                <Plus size={14} /> New Transaction
              </Link>
            )}
            {location === '/goals' && (
              <Link href="/goals" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                <Plus size={14} /> Create Goal
              </Link>
            )}
            {location === '/insights' && (
              <Link href="/simulator" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                <Compass size={14} /> Test Scenario
              </Link>
            )}

            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              data-testid="button-notifications"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell size={17} />
              <i />
            </button>

            <Link href={user ? '/profile' : '/login'} className="topbar-profile" aria-label={user ? 'Open profile' : 'Sign in'} data-testid="link-profile-shortcut">
              <span>{initials}</span>
              <ChevronDown size={13} />
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="page-content page-enter">{children}</main>

        {/* Footer */}
        <footer className="app-footer">
          <span>SYNOVATE · Understand your money. Test your choices. Plan your next move.</span>
          <span>
            <ShieldCheck size={13} style={{ color: '#0F9F75' }} /> DETERMINISTIC FINANCIAL ENGINE
          </span>
        </footer>
      </div>

      {/* Mobile Tabbar */}
      <nav className="mobile-tabbar" aria-label="Quick navigation">
        {[
          { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
          { href: '/transactions', label: 'Activity', icon: CreditCard },
          { href: '/insights', label: 'Insights', icon: BarChart3 },
          { href: '/simulator', label: 'Simulator', icon: Compass },
          { href: '/profile', label: 'Profile', icon: UserRound },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            href={href}
            key={href}
            className={location === href ? 'mobile-tab active' : 'mobile-tab'}
            data-testid={`mobile-link-${label.toLowerCase()}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Notifications Modal */}
      {notificationsOpen && (
        <Modal title="Activity & Notifications" onClose={() => setNotificationsOpen(false)}>
          <div className="notification-empty">
            <div className="notification-icon" style={{ background: '#E9F7F0', color: '#0F9F75' }}>
              <Bell size={20} />
            </div>
            <strong>All caught up!</strong>
            <p>Your financial engine is operating normally. Ledger entries and recurring commitments are synchronized.</p>
            <button className="btn btn-outline btn-sm" onClick={() => setNotificationsOpen(false)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Help & Guide Modal */}
      {helpOpen && (
        <Modal title="SYNOVATE Platform Guide" onClose={() => setHelpOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            <div style={{ display: 'flex', gap: 10, padding: 12, background: '#F8FAFC', border: '1px solid #E5EAF0', borderRadius: 10 }}>
              <ShieldCheck size={20} style={{ color: '#0F9F75', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: 13, color: '#142033', display: 'block', marginBottom: 2 }}>
                  Deterministic Calculation Guarantee
                </strong>
                <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Every figure on SYNOVATE is calculated by pure backend mathematical formulas. Generative AI is strictly restricted to qualitative explanations.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, padding: 12, background: '#F8FAFC', border: '1px solid #E5EAF0', borderRadius: 10 }}>
              <Compass size={20} style={{ color: '#2563EB', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: 13, color: '#142033', display: 'block', marginBottom: 2 }}>
                  Sandbox What-If Simulations
                </strong>
                <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  The What-If Simulator lets you adjust assumptions without altering your real transactions or ledger records.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, padding: 12, background: '#F8FAFC', border: '1px solid #E5EAF0', borderRadius: 10 }}>
              <Sparkles size={20} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: 13, color: '#142033', display: 'block', marginBottom: 2 }}>
                  Financial Copilot
                </strong>
                <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Ask questions about your finances in plain language. The assistant queries verified accounting data to explain your situation.
                </p>
              </div>
            </div>

            <button className="btn btn-primary btn-md" style={{ width: '100%', marginTop: 8 }} onClick={() => setHelpOpen(false)}>
              Got it, continue planning
            </button>
          </div>
        </Modal>
      )}

      {/* Embedded Floating Assistant Chat (when not on /assistant page) */}
      {location !== '/assistant' && <AssistantChat />}
    </div>
  );
}

