import type { GlassButtonProps } from '../../types';

export function GlassButton({ onClick, children, isActive, title, className = '' }: GlassButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 hover-neo-btn-green ${isActive ? 'bg-slate-200/60 text-slate-800' : 'text-slate-700'} ${className}`}
      title={title}
    >
      {children}
    </button>
  );
}
