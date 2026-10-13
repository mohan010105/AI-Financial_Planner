import { type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { X, AlertCircle, RefreshCw, ArrowUpRight } from 'lucide-react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'outline'; size?: 'sm' | 'md' };
export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return <button className={`btn btn-${variant} btn-${size} ${className}`} {...props}>{children}</button>;
}
export function Card({ children, className = '', ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return <section className={`surface-card ${className}`} {...props}>{children}</section>;
}
export function Input({ label, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return <label className="field-wrap">{label && <span className="field-label">{label}</span>}<input className={`field-input ${className}`} {...props} /></label>;
}
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-heading"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" data-testid="button-close-modal" onClick={onClose}><X size={18} /></button></div>
      {children}
    </div>
  </div>;
}
export function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return <div className="table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
export function Loading({ label = 'Loading status' }: { label?: string }) {
  return <div className="status-box" data-testid="loading-state" aria-label={label}><span className="skeleton status-skeleton" /><span className="skeleton status-skeleton short" /><span className="skeleton status-skeleton tiny" /></div>;
}
export function Empty({ title, description }: { title: string; description: string }) {
  return <div className="empty-state" data-testid="empty-state"><div className="empty-mark"><ArrowUpRight size={20} /></div><h3>{title}</h3><p>{description}</p></div>;
}
export type ErrorStateProps = {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({ title, description, error, onRetry, className = '' }: ErrorStateProps) {
  let resolvedTitle = title;
  let resolvedDescription = description;

  if (error) {
    if (import.meta.env.DEV) {
      console.warn('[SYNOVATE Diagnostics] Error state encountered:', error);
    }
    const errObj = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : null;
    const status = errObj && 'status' in errObj ? Number(errObj.status) : 0;
    const message = error instanceof Error ? error.message : String(errObj?.error ?? errObj?.message ?? error ?? '');

    if (status === 401 || status === 403 || message.includes('401') || message.includes('403') || message.toLowerCase().includes('unauthenticated')) {
      resolvedTitle = resolvedTitle ?? 'Session expired';
      resolvedDescription = resolvedDescription ?? 'Your session is no longer active. Please sign in again.';
    } else if (status >= 500 || message.includes('500') || message.toLowerCase().includes('failed')) {
      resolvedTitle = resolvedTitle ?? 'Unable to complete request';
      resolvedDescription = resolvedDescription ?? 'A server error occurred while processing this request. Please try again.';
    } else if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch') || message.toLowerCase().includes('failed to fetch')) {
      resolvedTitle = resolvedTitle ?? 'Connection issue';
      resolvedDescription = resolvedDescription ?? 'We couldn’t reach the server. Please check your internet connection and try again.';
    }
  }

  resolvedTitle = resolvedTitle ?? 'We couldn’t load this data.';
  resolvedDescription = resolvedDescription ?? 'Please check your connection and try again.';

  return (
    <div className={`error-state ${className}`} data-testid="error-state" role="alert">
      <AlertCircle size={22} />
      <div>
        <strong>{resolvedTitle}</strong>
        <p>{resolvedDescription}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} data-testid="button-retry">
          <RefreshCw size={14} /> Try again
        </Button>
      )}
    </div>
  );
}

