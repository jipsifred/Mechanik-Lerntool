import type { CSSProperties } from 'react';
import type { ProgressRingProps } from '../../types';

const VARIANT_TOKENS = {
  green: {
    base: 'var(--ring-green-base)',
    dark: 'var(--ring-green-dark)',
    bottom: 'var(--ring-green-bottom)',
    glow: 'var(--ring-green-glow)',
  },
  yellow: {
    base: 'var(--ring-yellow-base)',
    dark: 'var(--ring-yellow-dark)',
    bottom: 'var(--ring-yellow-bottom)',
    glow: 'var(--ring-yellow-glow)',
  },
} as const;

/**
 * Builds the metallic ring CSSProperties from 4 color tokens.
 * Produces the same conic-gradient + radial-gradient layered background
 * with identical stop angles and radial cutoffs as the original design.
 */
function ringBackground(
  base: string,
  dark: string,
  bottom: string,
  glow: string,
): CSSProperties {
  const metallic = `conic-gradient(from 0deg, ${base} 0deg, ${base} 30deg, ${dark} 60deg, ${dark} 70deg, ${base} 120deg, ${bottom} 180deg, ${base} 240deg, ${dark} 290deg, ${dark} 300deg, ${base} 330deg, ${base} 360deg)`;

  return {
    background: `
      radial-gradient(circle at center, #f8f8fa 30.7px, transparent 31.3px),
      radial-gradient(circle at center, transparent 32.6px, ${base} 33.2px, ${base} 39px, transparent 39.6px),
      ${metallic}
    `,
    borderRadius: '50%',
    boxShadow: `inset 0 1px 2px rgba(0, 0, 0, 0.05), 0 10px 20px -6px ${glow}`,
  };
}

export function ProgressRing({ progress, className, children, variant = 'green' }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const angle = (clamped / 100) * 360;
  const tokens = VARIANT_TOKENS[variant];

  const whiteStyle = ringBackground(
    'var(--ring-white-base)',
    'var(--ring-white-dark)',
    'var(--ring-white-bottom)',
    'var(--ring-white-glow)',
  );

  const fillStyle: CSSProperties = {
    ...ringBackground(tokens.base, tokens.dark, tokens.bottom, tokens.glow),
    WebkitMaskImage: `conic-gradient(from 0deg, black 0deg, black ${angle}deg, transparent ${angle}deg, transparent 360deg)`,
    maskImage: `conic-gradient(from 0deg, black 0deg, black ${angle}deg, transparent ${angle}deg, transparent 360deg)`,
  };

  return (
    <div className={`w-[82px] h-[82px] relative${className ? ` ${className}` : ''}`}>
      {/* Layer 1: White base ring */}
      <div style={whiteStyle} className="absolute inset-0" />

      {/* Layer 2: Colored progress arc */}
      <div style={fillStyle} className="absolute inset-0" />

      {/* Center content (children) */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          {children}
        </div>
      )}
    </div>
  );
}
