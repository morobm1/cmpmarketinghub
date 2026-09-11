import React from 'react';

export function Card({ title, actions, children, className = '' }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-surface-200 rounded-2xl shadow-sm overflow-hidden mb-5 ${className}`}>
      {title && (
        <div className="px-5 py-4 border-b border-surface-200 bg-surface-50 flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-bold text-surface-700 m-0">{title}</h3>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

type BtnVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'ghost';

const variantClasses: Record<BtnVariant, string> = {
  default: 'bg-white border-surface-200 text-surface-900 hover:bg-surface-50',
  primary: 'bg-brand-accent-2 border-brand-accent-2 text-[#0b1b24] hover:brightness-95',
  success: 'bg-success border-success text-white hover:brightness-95',
  warning: 'bg-warning border-warning text-white hover:brightness-95',
  danger: 'bg-danger border-danger text-white hover:brightness-95',
  ghost: 'bg-transparent border-transparent text-surface-600 hover:bg-surface-100',
};

export function Button({
  children,
  onClick,
  variant = 'default',
  size = 'md',
  disabled,
  type = 'button',
  className = '',
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2.5 text-sm'
      } ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }) {
  const tones: Record<string, string> = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-surface-100 text-surface-600 border-surface-200',
  };
  return <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function StatCard({ label, value, subtext, tone = 'default' }: { label: string; value: React.ReactNode; subtext?: string; tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger' }) {
  const toneClass: Record<string, string> = {
    default: 'text-brand-primary',
    accent: 'text-brand-accent-2',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };
  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5 text-center hover:shadow-md transition-shadow">
      <div className="text-[11px] font-bold text-surface-500 uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-[30px] font-bold leading-none ${toneClass[tone]}`}>{value}</div>
      {subtext && <div className="text-[12px] text-surface-400 mt-1.5">{subtext}</div>}
    </div>
  );
}

export function ProgressBar({ percent, tone }: { percent: number; tone?: 'success' | 'warning' | 'danger' }) {
  const t = tone || (percent >= 90 ? 'success' : percent >= 50 ? undefined : 'danger');
  const barClass = t === 'success' ? 'bg-gradient-to-r from-green-400 to-green-600' : t === 'danger' ? 'bg-gradient-to-r from-red-400 to-red-600' : t === 'warning' ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-brand-accent-2 to-brand-primary';
  return (
    <div className="w-full h-2.5 bg-surface-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${barClass}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent-2/30 focus:border-brand-accent-2 ${props.className || ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent-2/30 focus:border-brand-accent-2 ${props.className || ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent-2/30 focus:border-brand-accent-2 ${props.className || ''}`} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-5" onClick={onClose}>
      <div
        className={`bg-white border border-surface-200 rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-auto shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-surface-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold text-surface-900 m-0">{title}</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-900 text-2xl leading-none w-8 h-8 flex items-center justify-center">
            &times;
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-surface-200 flex gap-3 justify-end sticky bottom-0 bg-white">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="p-8 text-center text-surface-400 bg-surface-50 border border-dashed border-surface-200 rounded-xl text-sm">{children}</div>;
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto border border-surface-200 rounded-xl bg-white">{children}</div>;
}

export function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'center' | 'right' }) {
  return <th className={`px-3.5 py-3 text-[11px] font-bold text-surface-600 uppercase tracking-wide border-b-2 border-surface-200 whitespace-nowrap text-${align} bg-surface-50`}>{children}</th>;
}

export function Td({ children, align = 'left', className = '', colSpan }: { children?: React.ReactNode; align?: 'left' | 'center' | 'right'; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={`px-3.5 py-2.5 border-b border-surface-200 align-middle text-${align} ${className}`}>{children}</td>;
}
