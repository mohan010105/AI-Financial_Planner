import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useLogoutUser, type SessionUser } from '@workspace/api-client-react';
import { Activity, ArrowUpRight, Bell, ChevronDown, CircleHelp, Compass, CreditCard, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Sparkles, Target, UserRound, X } from 'lucide-react';
import { Modal } from '@/components/ui-kit';

const navGroups = [
  { label: 'WORKSPACE', items: [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Transactions', href: '/transactions', icon: CreditCard },
    { label: 'Goals', href: '/goals', icon: Target },
    { label: 'Simulator', href: '/simulator', icon: Compass },
  ] },
  { label: 'YOUR SPACE', items: [
    { label: 'AI assistant', href: '/assistant', icon: Sparkles },
    { label: 'Profile', href: '/profile', icon: UserRound },
    { label: 'Settings', href: '/settings', icon: Settings },
  ] },
];
const pageTitles: Record<string, string> = { '/': 'Overview', '/dashboard': 'Overview', '/login': 'Welcome back', '/register': 'Create your space', '/profile': 'Profile', '/transactions': 'Transactions', '/goals': 'Goals', '/simulator': 'Simulator', '/assistant': 'AI assistant', '/settings': 'Settings' };

export function AppLayout({ children, user }: { children: ReactNode; user: SessionUser | null }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const queryClient = useQueryClient();
  const logout = useLogoutUser();
  const title = pageTitles[location] ?? 'Your workspace';
  const initials = user?.displayName
    ? user.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    : user?.email.slice(0, 2).toUpperCase() ?? '?';

  function handleLogout(): void {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        setLocation('/login');
      },
    });
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-row"><Link href="/dashboard" className="brand-link" data-testid="link-brand"><span className="brand-symbol"><Activity size={20} strokeWidth={2.2} /></span><span>SYNOVATE<span className="brand-period">.</span></span></Link><button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button></div>
      <div className="workspace-chip"><span className="workspace-avatar">S</span><span><strong>Personal workspace</strong><small>{user ? 'Signed-in account' : 'Sign-in required'}</small></span><ChevronDown size={15} /></div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navGroups.map((group) => <div className="nav-group" key={group.label}><p className="nav-caption">{group.label}</p>{group.items.map(({ label, href, icon: Icon }) => {
          const active = location === href || (href === '/dashboard' && location === '/');
          return <Link href={href} key={href} className={`nav-link ${active ? 'nav-link-active' : ''}`} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setMobileOpen(false)}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === 'AI assistant' && <span className="nav-soon">NEW</span>}</Link>;
        })}</div>)}
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><div className="note-icon"><ShieldCheck size={16} /></div><div><strong>Your money, your call</strong><p>Clarity for the decisions ahead.</p></div></div><div className="sidebar-user"><div className="user-initials" data-testid="text-user-avatar">{initials}</div><div className="user-copy"><strong data-testid="text-user-name">{user?.displayName ?? (user ? 'Your profile' : 'Sign in')}</strong><small data-testid="text-user-email">{user?.email ?? 'Account access'}</small></div><Link href={user ? '/profile' : '/login'} className="user-menu icon-button" aria-label={user ? 'Open account profile' : 'Sign in'} data-testid="link-account-menu"><ChevronDown size={16} /></Link>{user && <button className="user-menu icon-button" type="button" aria-label="Log out" title="Log out" data-testid="button-logout" disabled={logout.isPending} onClick={handleLogout}><LogOut size={16} /></button>}</div>{logout.error && <p className="sidebar-user-error" role="alert" data-testid="error-logout">{logout.error.message}</p>}</div>
    </aside>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}
    <div className="main-column">
      <header className="topbar">
        <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu size={20} /></button>
        <div className="breadcrumbs"><span>Workspace</span><span className="crumb-separator">/</span><strong>{title}</strong></div>
        <div className="topbar-actions"><span className="topbar-date">Monday, 18 March</span><button className="icon-button notification-button" aria-label="Notifications" data-testid="button-notifications" onClick={() => setNotificationsOpen(true)}><Bell size={18} /><i /></button><Link href={user ? '/profile' : '/login'} className="topbar-profile" aria-label={user ? 'Open profile' : 'Sign in'} data-testid="link-profile-shortcut"><span>{initials}</span><ChevronDown size={14} /></Link></div>
      </header>
      <main className="page-content page-enter">{children}</main>
      <footer className="app-footer"><span>Made for clearer decisions.</span><span><CircleHelp size={13} /> SYNOVATE · PHASE 2</span></footer>
    </div>
    <nav className="mobile-tabbar" aria-label="Quick navigation">{[{ href: '/dashboard', label: 'Home', icon: LayoutDashboard }, { href: '/transactions', label: 'Activity', icon: CreditCard }, { href: '/goals', label: 'Goals', icon: Target }, { href: '/profile', label: 'Profile', icon: UserRound }].map(({ href, label, icon: Icon }) => <Link href={href} key={href} className={location === href ? 'mobile-tab active' : 'mobile-tab'} data-testid={`mobile-link-${label.toLowerCase()}`}><Icon size={18} /><span>{label}</span></Link>)}</nav>
    {notificationsOpen && <Modal title="Notifications" onClose={() => setNotificationsOpen(false)}><div className="notification-empty"><div className="notification-icon"><Bell size={19} /></div><strong>You’re all caught up</strong><p>Updates will appear here as your SYNOVATE workspace grows.</p><button className="text-action" onClick={() => setNotificationsOpen(false)}>Close <ArrowUpRight size={14} /></button></div></Modal>}
  </div>;
}
