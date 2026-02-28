import type { CSSProperties } from 'react';
import type { GlassContainerProps } from '../../types';

export function GlassContainer({ children, className = '' }: GlassContainerProps) {
  return (
    <div
      className={`glass-panel rounded-full p-1 flex items-center ${className}`}
      style={{ '--g-angle': '115deg', '--g-stop2': '35%', '--g-stop3': '65%' } as CSSProperties}
    >
      {children}
    </div>
  );
}
