import { useRef, useState, useEffect } from 'react';

/**
 * Computes the gradient angle needed so the white highlight stripe
 * on a glass-panel border always appears at a consistent visual
 * angle (TARGET_SLOPE_DEG from horizontal), regardless of pill dimensions.
 *
 * Formula: A = 90° + arctan((W / H) × tan(targetSlope°))
 */
const TARGET_SLOPE_DEG = 15;

export function useGlassAngle() {
  const ref = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(140);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const slope = Math.tan((TARGET_SLOPE_DEG * Math.PI) / 180);

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const raw = 90 + (Math.atan((width / height) * slope) * 180) / Math.PI;
      setAngle(Math.round(Math.min(raw, 150) * 10) / 10);
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  return { ref, angle };
}
