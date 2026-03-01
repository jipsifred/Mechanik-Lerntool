import type { CSSProperties } from 'react';
import { useGlassAngle } from '../../hooks/useGlassAngle';
import type { GlassContainerProps } from '../../types';

export function GlassContainer({ children, className = '' }: GlassContainerProps) {
  const { ref, angle } = useGlassAngle();

  return (
    <div
      ref={ref}
      className={`glass-panel rounded-full p-1 flex items-center ${className}`}
      style={{ '--g-angle': `${angle}deg`, '--g-stop2': '35%', '--g-stop3': '65%' } as CSSProperties}
    >
      {children}
    </div>
  );
}
