import type { GlassButtonProps } from '../../types';

export function GlassButton({ onClick, children, isActive, disabled = false, title, className = '' }: GlassButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 hover-neo-btn-green disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? 'bg-slate-200/60 text-slate-800' : 'text-slate-700'} ${className}`}
      title={title}
    >
      {children}
    </button>
  );
}
