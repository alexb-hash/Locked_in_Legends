import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Scroll-linked vertical parallax for layered / overlapping landing elements.
 * `depth` is measured in px of travel across the element's viewport pass:
 * positive drifts up (feels closer), negative drifts down (feels further away).
 */
export function Parallax({
  children,
  className,
  depth = 40,
  rotate = 0,
}: {
  children: ReactNode;
  className?: string;
  depth?: number;
  rotate?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useSpring(useTransform(scrollYProgress, [0, 1], [depth, -depth]), {
    stiffness: 90,
    damping: 22,
    mass: 0.4,
  });
  const r = useSpring(useTransform(scrollYProgress, [0, 1], [rotate, -rotate]), {
    stiffness: 90,
    damping: 22,
  });

  if (reduced) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div ref={ref} style={{ y, rotate: r }} className={cn("will-change-transform", className)}>
      {children}
    </motion.div>
  );
}
