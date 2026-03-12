import { useId } from 'react';
import type { ProgressRingProps } from '../../types';

const NATURAL_SIZE = 82;
const CIRCUMFERENCE = 2 * Math.PI * 105;

export function ProgressRing({ progress, className, children, scale = 1 }: ProgressRingProps) {
  const uid = useId().replace(/:/g, '');
  const clamped = Math.max(0, Math.min(100, progress));
  const progressLen = (clamped / 100) * CIRCUMFERENCE;
  const dashValue = `${progressLen} ${CIRCUMFERENCE}`;
  const size = NATURAL_SIZE * scale;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '50%',
        position: 'relative',
        boxShadow: '0 0 8px rgba(0, 0, 0, 0.12)',
      }}
    >
      {/* Track (grey groove) */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'var(--ring-track)',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <svg
          viewBox="0 0 250 250"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'rotate(-90deg)',
            overflow: 'visible',
          }}
        >
          <defs>
            {/* 1. Radial gradient for the bar */}
            <radialGradient id={`${uid}-grad`} cx="125" cy="125" r="123" gradientUnits="userSpaceOnUse">
              <stop offset="55%" stopColor="var(--ring-color-inner)" />
              <stop offset="120%" stopColor="var(--ring-color-outer)" />
            </radialGradient>

            {/* 2. Under-glow filter (green ambient shadow) */}
            <filter id={`${uid}-underglow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="blur" />
              <feComponentTransfer in="blur" result="faded">
                <feFuncA type="linear" slope="2.4" />
              </feComponentTransfer>
            </filter>

            {/* 2.5. Dark physical shadow filter */}
            <filter id={`${uid}-darkshadow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feComponentTransfer in="blur" result="faded">
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
            </filter>

            {/* 3. Round-corners filter */}
            <filter id={`${uid}-round`}>
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            </filter>

            {/* 4. Inner-glow filter (glossy edge) */}
            <filter id={`${uid}-innerglow`}>
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
              <feColorMatrix in="goo" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1 1" result="inverseAlpha" />
              <feGaussianBlur in="inverseAlpha" stdDeviation="6.5" result="blurInverse" />
              <feComposite in="blurInverse" in2="goo" operator="in" result="innerGlowMask" />
              <feFlood floodColor="var(--ring-color-glow)" result="glowColor" />
              <feComposite in="glowColor" in2="innerGlowMask" operator="in" result="coloredGlow" />
              <feComponentTransfer in="coloredGlow" result="finalGlow">
                <feFuncA type="linear" slope="2.9" />
              </feComponentTransfer>
            </filter>

            {/* 5. Mask to fade out glow at outer edge */}
            <radialGradient id={`${uid}-maskfade`} cx="125" cy="125" r="125" gradientUnits="userSpaceOnUse">
              <stop offset="85%" stopColor="white" />
              <stop offset="96%" stopColor="black" />
            </radialGradient>
            <mask id={`${uid}-mask`}>
              <rect width="250" height="250" fill={`url(#${uid}-maskfade)`} />
            </mask>
          </defs>

          {/* Layer 0: Green ambient underglow */}
          <circle
            cx="125" cy="125" r="105"
            fill="none"
            strokeWidth="var(--ring-bar-thickness)"
            strokeLinecap="butt"
            strokeDasharray={dashValue}
            strokeDashoffset="0"
            filter={`url(#${uid}-underglow)`}
            stroke="var(--ring-color-underglow)"
            style={{ transition: 'stroke-dasharray 0.3s ease' }}
          />

          {/* Layer 0.5: Dark physical shadow */}
          <circle
            cx="125" cy="125" r="105"
            fill="none"
            strokeWidth="var(--ring-bar-thickness)"
            strokeLinecap="butt"
            strokeDasharray={dashValue}
            strokeDashoffset="0"
            filter={`url(#${uid}-darkshadow)`}
            stroke="var(--ring-color-darkshadow)"
            style={{ transition: 'stroke-dasharray 0.3s ease' }}
          />

          {/* Layer 1: Gradient bar */}
          <circle
            cx="125" cy="125" r="105"
            fill="none"
            strokeWidth="var(--ring-bar-thickness)"
            strokeLinecap="butt"
            strokeDasharray={dashValue}
            strokeDashoffset="0"
            filter={`url(#${uid}-round)`}
            stroke={`url(#${uid}-grad)`}
            style={{ transition: 'stroke-dasharray 0.3s ease' }}
          />

          {/* Layer 2: Inner glow (glossy highlight) */}
          <circle
            cx="125" cy="125" r="105"
            fill="none"
            strokeWidth="var(--ring-bar-thickness)"
            strokeLinecap="butt"
            strokeDasharray={dashValue}
            strokeDashoffset="0"
            filter={`url(#${uid}-innerglow)`}
            stroke="#ffffff"
            mask={`url(#${uid}-mask)`}
            style={{ transition: 'stroke-dasharray 0.3s ease' }}
          />
        </svg>

        {/* Inner white center */}
        <div
          style={{
            width: `calc(100% - ${(80 / 250) * size}px)`,
            height: `calc(100% - ${(80 / 250) * size}px)`,
            backgroundColor: 'var(--ring-bg)',
            borderRadius: '50%',
            zIndex: 10,
            boxShadow: 'inset 0 0 8px rgba(0, 0, 0, 0.12)',
          }}
        />
      </div>

      {/* Center content (children) */}
      {children && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
