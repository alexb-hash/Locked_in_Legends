import { motion, useInView, type HTMLMotionProps } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Pre-hydration safety                                               */
/* ------------------------------------------------------------------ */

/**
 * The motion runtime only takes over once the client bundle has hydrated. If
 * the server-rendered markup starts at opacity 0 / clipped, the page looks
 * empty for as long as that takes. So the very first paint renders plain,
 * visible markup with a CSS-only entrance (`reveal-css`), and JS-driven
 * reveals are reserved for components mounted after hydration (client
 * navigations, conditional UI).
 */
let appHydrated = false;

function useStaticFirstPaint() {
  const isStatic = useRef(!appHydrated);
  useEffect(() => {
    appHydrated = true;
  }, []);
  return isStatic.current;
}

function StaticReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={cn("reveal-css", className)} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

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
  const isStatic = useStaticFirstPaint();
  if (isStatic) {
    return (
      <StaticReveal className={className} delay={delay}>
        {children}
      </StaticReveal>
    );
  }
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
  const isStatic = useStaticFirstPaint();
  if (isStatic) return <div className={cn(className)}>{children}</div>;
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
  const isStatic = useStaticFirstPaint();
  if (isStatic) return <StaticReveal className={className}>{children}</StaticReveal>;
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
  const isStatic = useStaticFirstPaint();
  if (isStatic) {
    return (
      <StaticReveal className={className} delay={delay}>
        {children}
      </StaticReveal>
    );
  }
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
  const isStatic = useStaticFirstPaint();
  if (isStatic) return <div className={cn(className)}>{children}</div>;
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
  const ref = useRef<HTMLDivElement>(null);
  const isStatic = useStaticFirstPaint();
  const inView = useInView(ref, { once: true, amount: 0.1, margin: "0px 0px -8% 0px" });

  const hidden =
    from === "left"
      ? { x: "-100%", y: 0, opacity: 0 }
      : from === "right"
        ? { x: "100%", y: 0, opacity: 0 }
        : { x: 0, y: "100%", opacity: 0 };

  if (isStatic) {
    return (
      <div className={cn("overflow-hidden", className)}>
        <StaticReveal delay={delay}>{children}</StaticReveal>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      <motion.div
        initial={hidden}
        animate={inView ? { x: 0, y: 0, opacity: 1 } : hidden}
        transition={{ duration: 0.9, delay, ease: MASK_EASE }}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </div>
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
  const isStatic = useStaticFirstPaint();
  if (isStatic) return <div className={cn(className)}>{children}</div>;
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
  const isStatic = useStaticFirstPaint();
  if (isStatic) return <StaticReveal className={className}>{children}</StaticReveal>;
  return (
    <motion.div
      variants={{
        hidden: { clipPath: "inset(100% 0% 0% 0%)", opacity: 0, y: 24 },
        show: { clipPath: "inset(0% 0% 0% 0%)", opacity: 1, y: 0 },
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
  const isStatic = useStaticFirstPaint();
  const words = text.split(" ");

  if (isStatic) {
    return (
      <span className={cn("inline-flex flex-wrap justify-center gap-x-[0.28em]", className)}>
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className={cn(
              "reveal-css inline-block py-[0.06em]",
              accentFrom !== undefined && i >= accentFrom && "text-gradient",
            )}
            style={{ animationDelay: `${delay + i * 0.06}s` }}
          >
            {word}
          </span>
        ))}
      </span>
    );
  }

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
