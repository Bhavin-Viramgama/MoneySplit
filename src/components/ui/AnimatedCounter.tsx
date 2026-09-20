import { useEffect, useRef } from 'react';
import { animate, useMotionValue, useTransform, motion } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
}

export function AnimatedCounter({ value, format = (v) => v.toString(), className }: AnimatedCounterProps) {
  const count = useMotionValue(value);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const display = useTransform(rounded, (latest) => format(latest));
  const previousValue = useRef(value);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 0.8,
      ease: "easeOut",
    });
    previousValue.current = value;
    return controls.stop;
  }, [value, count]);

  return <motion.span className={className}>{display}</motion.span>;
}
