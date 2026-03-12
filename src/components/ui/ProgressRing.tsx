// v2
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

const INNER_BORDER_MASK = 'radial-gradient(circle at center, transparent 30.7px, black 31.3px, black 32.6px, transparent 33.2px)';
const OUTER_BORDER_MASK = 'radial-gradient(circle at center, transparent 39px, black 39.6px, black 41px)';
const WHITE_BAND_MASK = 'radial-gradient(circle at center, transparent 32.6px, black 33.2px, black 39px, transparent 39.6px)';

/**
 * Builds the metallic ring CSSProperties from 4 color tokens.
 * Produces the same conic-gradient + radial-gradient layered background
 * with identical stop angles and radial cutoffs as the original design.
 */
function metallicBackground(
  base: string,
  dark: string,
  bottom: string,
  rotation = 0,
): string {
  return `conic-gradient(from ${rotation}deg, ${base} 0deg, ${base} 30deg, ${dark} 60deg, ${dark} 70deg, ${base} 120deg, ${bottom} 180deg, ${base} 240deg, ${dark} 290deg, ${dark} 300deg, ${base} 330deg, ${base} 360deg)`;
}

function ringCoreBackground(
  base: string,
  glow: string,
): CSSProperties {
  return {
    background: `
      radial-gradient(circle at center, #f8f8fa 30.7px, transparent 31.3px),
      radial-gradient(circle at center, transparent 32.6px, ${base} 33.2px, ${base} 39px, transparent 39.6px)
    `,
    borderRadius: '50%',
    boxShadow: `inset 0 1px 2px rgba(0, 0, 0, 0.05), 0 10px 20px -6px ${glow}`,
  };
}

function metallicBorderStyle(
  base: string,
  dark: string,
  bottom: string,
  rotation: number,
  mask: string,
): CSSProperties {
  return {
    background: metallicBackground(base, dark, bottom, rotation),
    borderRadius: '50%',
    WebkitMaskImage: mask,
    maskImage: mask,
  };
}

const NATURAL_SIZE = 82;

export function ProgressRing({ progress, className, children, variant = 'green', scale = 1 }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const angle = (clamped / 100) * 360;
  const tokens = VARIANT_TOKENS[variant];
  const displaySize = NATURAL_SIZE * scale;

  const whiteCoreStyle = ringCoreBackground(
    'var(--ring-white-base)',
    'var(--ring-white-glow)',
  );

  const outerWhiteBorderStyle = metallicBorderStyle(
    'var(--ring-white-base)',
    'var(--ring-white-dark)',
    'var(--ring-white-bottom)',
    0,
    OUTER_BORDER_MASK,
  );

  const innerWhiteBorderStyle = metallicBorderStyle(
    'var(--ring-white-base)',
    'var(--ring-white-dark)',
    'var(--ring-white-bottom)',
    180,
    INNER_BORDER_MASK,
  );

  const fillMaskStyle: CSSProperties = {
    WebkitMaskImage: `conic-gradient(from 0deg, black 0deg, black ${angle}deg, transparent ${angle}deg, transparent 360deg)`,
    maskImage: `conic-gradient(from 0deg, black 0deg, black ${angle}deg, transparent ${angle}deg, transparent 360deg)`,
  };

  const fillCoreStyle = ringCoreBackground(tokens.base, tokens.glow);

  const outerFillBorderStyle = metallicBorderStyle(
    tokens.base,
    tokens.dark,
    tokens.bottom,
    0,
    OUTER_BORDER_MASK,
  );

  const innerFillBorderStyle = metallicBorderStyle(
    tokens.base,
    tokens.dark,
    tokens.bottom,
    180,
    INNER_BORDER_MASK,
  );

  const whiteBandShadowStyle: CSSProperties = {
    background: `
      conic-gradient(
        from 0deg,
        var(--ring-white-shadow-strong) 0deg,
        var(--ring-white-shadow-soft) 24deg,
        transparent 62deg,
        transparent 118deg,
        var(--ring-white-shadow-soft) 156deg,
        var(--ring-white-shadow-strong) 180deg,
        var(--ring-white-shadow-soft) 204deg,
        transparent 242deg,
        transparent 298deg,
        var(--ring-white-shadow-soft) 336deg,
        var(--ring-white-shadow-strong) 360deg
      )
    `,
    borderRadius: '50%',
    WebkitMaskImage: WHITE_BAND_MASK,
    maskImage: WHITE_BAND_MASK,
  };

  // The outer div reports the correct visual size for layout.
  // The inner div always stays at NATURAL_SIZE (82px) and is scaled via CSS transform.
  // This ensures all pixel-precise gradients, masks and shadows stay perfectly proportioned.
  return (
    <div
      className={`relative overflow-visible${className ? ` ${className}` : ''}`}
      style={{ width: displaySize, height: displaySize, flexShrink: 0 }}
    >
      <div
        style={{
          position: 'absolute',
          width: NATURAL_SIZE,
          height: NATURAL_SIZE,
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        {/* Layer 1: White base ring core */}
        <div style={whiteCoreStyle} className="absolute inset-0" />

        {/* Layer 2: White outer border */}
        <div style={outerWhiteBorderStyle} className="absolute inset-0" />

        {/* Layer 3: White inner border */}
        <div style={innerWhiteBorderStyle} className="absolute inset-0" />

        {/* Layer 4: Subtle shading for the white mid ring */}
        <div style={whiteBandShadowStyle} className="absolute inset-0" />

        {/* Layer 5: Colored progress arc */}
        <div style={fillMaskStyle} className="absolute inset-0">
          <div style={fillCoreStyle} className="absolute inset-0" />
          <div style={outerFillBorderStyle} className="absolute inset-0" />
          <div style={innerFillBorderStyle} className="absolute inset-0" />
        </div>

        {/* Center content (children) */}
        {children && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
