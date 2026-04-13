'use client';

import { useRef } from 'react';
import {
  LazyMotion,
  domAnimation,
  m,
  useScroll,
  useTransform,
  useReducedMotion,
} from 'framer-motion';

interface HouseAnimationProps {
  labels: {
    contract: string;
    key: string;
    payment: string;
  };
}

// ─── Reduced-motion fallback: static house with all elements visible ──────────
function StaticHouse({ labels }: HouseAnimationProps) {
  return (
    <section className="py-20 flex items-center justify-center bg-warm-50">
      <div className="relative flex flex-col items-center gap-8">
        {/* Static house */}
        <div className="relative w-56 h-48">
          {/* Roof */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-10 w-0 h-0"
            style={{
              borderLeft: '7rem solid transparent',
              borderRight: '7rem solid transparent',
              borderBottom: '4rem solid #f0a500',
            }}
          />
          {/* Walls */}
          <div className="absolute bottom-0 left-0 w-full h-36 bg-charcoal-200 rounded-b-sm" />
          {/* Window */}
          <div className="absolute top-4 left-5 w-10 h-10 bg-warm-100 border-2 border-charcoal-300 rounded-sm" />
          {/* Door */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-16 bg-sage-500 rounded-t-sm" />
        </div>

        {/* Labels row */}
        <div className="flex gap-8 text-xs font-medium text-charcoal-600">
          <span>{labels.contract}</span>
          <span>{labels.key}</span>
          <span>{labels.payment}</span>
        </div>
      </div>
    </section>
  );
}

// ─── Document SVG icon ────────────────────────────────────────────────────────
function ContractIcon() {
  return (
    <svg
      width="40"
      height="48"
      viewBox="0 0 40 48"
      fill="none"
      aria-hidden="true"
      className="drop-shadow-md"
    >
      <rect width="40" height="48" rx="4" fill="#f0a500" />
      <rect x="8" y="10" width="24" height="3" rx="1.5" fill="#fefcf7" />
      <rect x="8" y="18" width="24" height="3" rx="1.5" fill="#fefcf7" />
      <rect x="8" y="26" width="16" height="3" rx="1.5" fill="#fefcf7" />
    </svg>
  );
}

// ─── Key SVG icon ─────────────────────────────────────────────────────────────
function KeyIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      className="drop-shadow-md"
    >
      <circle cx="16" cy="16" r="11" stroke="#5a7a5a" strokeWidth="4" fill="none" />
      <circle cx="16" cy="16" r="5" fill="#5a7a5a" />
      <rect x="24" y="15" width="18" height="4" rx="2" fill="#5a7a5a" />
      <rect x="36" y="19" width="4" height="7" rx="2" fill="#5a7a5a" />
      <rect x="30" y="19" width="4" height="5" rx="2" fill="#5a7a5a" />
    </svg>
  );
}

// ─── Payment card SVG icon ────────────────────────────────────────────────────
function PaymentIcon() {
  return (
    <svg
      width="48"
      height="32"
      viewBox="0 0 48 32"
      fill="none"
      aria-hidden="true"
      className="drop-shadow-md"
    >
      <rect width="48" height="32" rx="4" fill="#2c2c2c" />
      <rect y="9" width="48" height="7" fill="#6b6b6b" />
      <rect x="8" y="21" width="14" height="4" rx="2" fill="#d1d1d1" />
      <rect x="30" y="21" width="10" height="4" rx="2" fill="#f0a500" />
    </svg>
  );
}

// ─── Animated house component ─────────────────────────────────────────────────
export function HouseAnimation({ labels }: HouseAnimationProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <StaticHouse labels={labels} />;
  }

  return (
    <LazyMotion features={domAnimation}>
      <AnimatedHouseInner labels={labels} />
    </LazyMotion>
  );
}

// Split into inner so LazyMotion wraps the m.* calls
function AnimatedHouseInner({ labels }: HouseAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // ── House parts ──────────────────────────────────────────────────────────────
  // Phase: [0, 0.3] static  |  [0.3, 0.7] deconstruct  |  [0.7, 1] open
  const roofY = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 0, -60, -120]);
  const roofRotate = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 0, -4, -8]);
  const roofOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [1, 1, 0.6, 0.3]);

  const leftWallX = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 0, -40, -80]);
  const leftWallOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [1, 1, 0.7, 0.4]);

  const rightWallX = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 0, 40, 80]);
  const rightWallOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [1, 1, 0.7, 0.4]);

  const doorScale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [1, 1, 0.9, 0.8]);
  const doorY = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 0, 20, 40]);
  const doorOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [1, 1, 0.8, 0.5]);

  const windowOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [1, 1, 0.6, 0.3]);

  // ── Interior elements ────────────────────────────────────────────────────────
  // Appear as house opens: opacity 0→1 starting at scroll 0.3
  const contractY = useTransform(scrollYProgress, [0.3, 0.7, 1], [0, -30, -60]);
  const contractX = useTransform(scrollYProgress, [0.3, 0.7, 1], [0, -20, -40]);
  const contractOpacity = useTransform(scrollYProgress, [0.3, 0.5, 0.7, 1], [0, 0.4, 0.8, 1]);
  const contractScale = useTransform(scrollYProgress, [0.3, 0.6, 1], [0.5, 0.8, 1]);

  const keyY = useTransform(scrollYProgress, [0.3, 0.7, 1], [0, -20, -40]);
  const keyX = useTransform(scrollYProgress, [0.3, 0.7, 1], [0, 30, 60]);
  const keyOpacity = useTransform(scrollYProgress, [0.3, 0.5, 0.7, 1], [0, 0.4, 0.8, 1]);
  const keyScale = useTransform(scrollYProgress, [0.3, 0.6, 1], [0.5, 0.8, 1]);

  const paymentY = useTransform(scrollYProgress, [0.3, 0.7, 1], [0, 40, 80]);
  const paymentOpacity = useTransform(scrollYProgress, [0.3, 0.5, 0.7, 1], [0, 0.4, 0.8, 1]);
  const paymentScale = useTransform(scrollYProgress, [0.3, 0.6, 1], [0.5, 0.8, 1]);

  // Labels appear late in the animation
  const labelOpacity = useTransform(scrollYProgress, [0.6, 0.85, 1], [0, 0.6, 1]);

  return (
    // Scroll sentinel — h-[250vh] gives the animation space to run
    <div ref={containerRef} className="relative h-[250vh]">
      {/* Sticky viewport panel */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden bg-warm-50">
        {/* Section label */}
        <m.p
          style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [0, 1]) }}
          className="absolute top-16 text-xs font-semibold tracking-widest uppercase text-charcoal-400"
        >
          Everything inside one roof
        </m.p>

        {/* Central house stage */}
        <div className="relative flex items-center justify-center w-72 h-72 md:w-96 md:h-96">
          {/* ── Roof (triangle via CSS borders) ─────────────────────────────── */}
          <m.div
            style={{ y: roofY, rotate: roofRotate, opacity: roofOpacity }}
            className="absolute left-1/2 -translate-x-1/2"
            // Position roof top so its bottom aligns with the wall top
            // Wall occupies bottom half of stage, roof sits above center
            // Using top offset so triangle base aligns with wall top
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '7rem solid transparent',
                borderRight: '7rem solid transparent',
                borderBottom: '4.5rem solid #f0a500',
                // Offset so the roof base sits ~at the wall top
                marginTop: '-4.5rem',
              }}
            />
          </m.div>

          {/* ── Walls container (left + right split from center) ─────────────── */}
          {/* Left wall */}
          <m.div
            style={{ x: leftWallX, opacity: leftWallOpacity }}
            className="absolute left-1/2 -translate-x-full bottom-4 w-28 md:w-36 h-36 md:h-44 bg-charcoal-200 origin-right"
          >
            {/* Window on left wall */}
            <m.div
              style={{ opacity: windowOpacity }}
              className="absolute top-4 right-4 w-9 h-9 bg-warm-100 border-2 border-charcoal-300 rounded-sm"
            />
          </m.div>

          {/* Right wall */}
          <m.div
            style={{ x: rightWallX, opacity: rightWallOpacity }}
            className="absolute left-1/2 bottom-4 w-28 md:w-36 h-36 md:h-44 bg-charcoal-200 origin-left"
          />

          {/* ── Door ────────────────────────────────────────────────────────── */}
          <m.div
            style={{ scale: doorScale, y: doorY, opacity: doorOpacity }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-16 bg-sage-500 rounded-t-sm z-10"
          />

          {/* ── Contract icon (floats up-left) ──────────────────────────────── */}
          <m.div
            style={{ x: contractX, y: contractY, opacity: contractOpacity, scale: contractScale }}
            className="absolute left-1/4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-20"
          >
            <ContractIcon />
            <m.span
              style={{ opacity: labelOpacity }}
              className="text-xs font-medium text-charcoal-600 whitespace-nowrap text-center"
            >
              {labels.contract}
            </m.span>
          </m.div>

          {/* ── Key icon (floats up-right) ───────────────────────────────────── */}
          <m.div
            style={{ x: keyX, y: keyY, opacity: keyOpacity, scale: keyScale }}
            className="absolute right-1/4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-20"
          >
            <KeyIcon />
            <m.span
              style={{ opacity: labelOpacity }}
              className="text-xs font-medium text-charcoal-600 whitespace-nowrap text-center"
            >
              {labels.key}
            </m.span>
          </m.div>

          {/* ── Payment icon (floats down) ───────────────────────────────────── */}
          <m.div
            style={{ y: paymentY, opacity: paymentOpacity, scale: paymentScale }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20"
          >
            <PaymentIcon />
            <m.span
              style={{ opacity: labelOpacity }}
              className="text-xs font-medium text-charcoal-600 whitespace-nowrap text-center"
            >
              {labels.payment}
            </m.span>
          </m.div>
        </div>

        {/* Scroll nudge — fades out once user starts scrolling */}
        <m.p
          style={{ opacity: useTransform(scrollYProgress, [0, 0.15], [1, 0]) }}
          className="absolute bottom-10 text-xs text-charcoal-400 flex items-center gap-2"
        >
          <span className="inline-block animate-bounce">↓</span>
          Scroll to explore
        </m.p>
      </div>
    </div>
  );
}
