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
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <div className="error-state" data-testid="error-state"><AlertCircle size={22} /><div><strong>We couldn’t load this status.</strong><p>Please check your connection and try again.</p></div><Button variant="outline" size="sm" onClick={onRetry} data-testid="button-retry"><RefreshCw size={14} /> Try again</Button></div>;
}
