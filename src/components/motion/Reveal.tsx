import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  once?: boolean;
} & Omit<HTMLMotionProps<"div">, "children">;

/**
 * Dreamy blur-in reveal used for page and section entrances.
 * Animates on mount (not on scroll) so freshly mounted routes always paint,
 * even when the intersection observer never fires during a route transition.
 */
export function Reveal({ children, delay = 0, className, y = 18, once: _once, ...rest }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(14px)", y }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Staggered container: direct <RevealItem> children animate in sequence. */
export function RevealGroup({
  children,
  className,
  stagger = 0.07,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, filter: "blur(12px)", y: 16 },
        show: { opacity: 1, filter: "blur(0px)", y: 0 },
      }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

/** Gentle floating wrapper for hero cards and trophies. */
export function Floaty({
  children,
  className,
  amount = 8,
  duration = 7,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
  duration?: number;
  delay?: number;
}) {
  return (
    <motion.div
      animate={{ y: [0, -amount, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Scroll-triggered variants (marketing / landing sections)            */
/* ------------------------------------------------------------------ */

/** Blur-in reveal that fires when the block scrolls into view (once). */
export function ScrollReveal({ children, delay = 0, className, y = 28, once = true, ...rest }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(16px)", y }}
      whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      viewport={{ once, amount: 0.25, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Staggered container whose <RevealItem> children animate on scroll-in. */
export function ScrollRevealGroup({
  children,
  className,
  stagger = 0.09,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Mask-wipe reveals + per-word headline entrance                      */
/* ------------------------------------------------------------------ */

const MASK_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Clip-path wipe + rise. Reads as a printed panel sliding into place rather
 * than a plain fade — used for the broken-grid tiles on the landing page.
 */
export function MaskReveal({
  children,
  className,
  delay = 0,
  from = "bottom",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: "bottom" | "left" | "right";
}) {
  const hidden =
    from === "left"
      ? "inset(0 100% 0 0)"
      : from === "right"
        ? "inset(0 0 0 100%)"
        : "inset(100% 0 0 0)";

  return (
    <motion.div
      initial={{ clipPath: hidden, opacity: 0, y: from === "bottom" ? 26 : 0 }}
      whileInView={{ clipPath: "inset(0 0 0 0)", opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.9, delay, ease: MASK_EASE }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

/** Staggered mask-wipe container; children use <MaskItem>. */
export function MaskRevealGroup({
  children,
  className,
  stagger = 0.1,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -10% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function MaskItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { clipPath: "inset(100% 0 0 0)", opacity: 0, y: 24 },
        show: { clipPath: "inset(0 0 0 0)", opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.85, ease: MASK_EASE }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

/** Headline entrance: each word rises out of its own clipped line box. */
export function WordReveal({
  text,
  className,
  delay = 0,
  accentFrom,
}: {
  text: string;
  className?: string;
  delay?: number;
  /** Words from this index onward get the gradient accent treatment. */
  accentFrom?: number;
}) {
  const words = text.split(" ");
  return (
    <motion.span
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: delay } } }}
      className={cn("inline-flex flex-wrap justify-center gap-x-[0.28em]", className)}
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden py-[0.06em]">
          <motion.span
            variants={{
              hidden: { y: "110%", opacity: 0 },
              show: { y: "0%", opacity: 1 },
            }}
            transition={{ duration: 0.75, ease: MASK_EASE }}
            className={cn("inline-block", accentFrom !== undefined && i >= accentFrom && "text-gradient")}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
