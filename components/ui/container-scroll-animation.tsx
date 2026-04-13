'use client';

import React, { useRef } from 'react';
import { LazyMotion, domAnimation, m, useScroll, useTransform } from 'framer-motion';

export function ContainerScroll({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <LazyMotion features={domAnimation}>
      <ContainerScrollInner titleComponent={titleComponent}>{children}</ContainerScrollInner>
    </LazyMotion>
  );
}

function ContainerScrollInner({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Multi-point keyframes for a smooth, gradual animation
  // The card starts tilted and slowly eases into flat position over the full scroll range
  const rotate = useTransform(
    scrollYProgress,
    [0, 0.15, 0.35, 0.55, 0.75, 1],
    [20, 16, 10, 4, 1, 0]
  );
  const scale = useTransform(
    scrollYProgress,
    [0, 0.15, 0.35, 0.55, 0.75, 1],
    isMobile ? [0.7, 0.74, 0.8, 0.85, 0.88, 0.9] : [1.05, 1.04, 1.03, 1.01, 1.0, 1.0]
  );
  const translate = useTransform(
    scrollYProgress,
    [0, 0.2, 0.4, 0.6, 0.8, 1],
    [0, -15, -35, -60, -85, -100]
  );
  // Title fades up slightly as you scroll
  const titleOpacity = useTransform(scrollYProgress, [0, 0.1, 0.5, 0.8, 1], [0.3, 1, 1, 0.8, 0.6]);

  return (
    <div
      className="h-[45rem] md:h-[60rem] flex items-center justify-center relative p-2 md:p-20"
      ref={containerRef}
    >
      <div
        className="py-10 md:py-40 w-full relative"
        style={{
          perspective: '1000px',
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} opacity={titleOpacity} />
        <Card rotate={rotate} _translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
}

function Header({
  translate,
  titleComponent,
  opacity,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  translate: any;
  titleComponent: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opacity: any;
}) {
  return (
    <m.div
      style={{
        translateY: translate,
        opacity,
      }}
      className="div max-w-5xl mx-auto text-center"
    >
      {titleComponent}
    </m.div>
  );
}

function Card({
  rotate,
  scale,
  _translate,
  children,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rotate: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scale: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _translate: any;
  children: React.ReactNode;
}) {
  return (
    <m.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003',
      }}
      className="max-w-5xl -mt-12 mx-auto h-[30rem] md:h-[40rem] w-full border-4 border-charcoal-200 p-2 md:p-6 bg-charcoal-800 rounded-[30px] shadow-2xl"
    >
      <div className="h-full w-full overflow-hidden rounded-2xl bg-warm-50 md:rounded-2xl md:p-4">
        {children}
      </div>
    </m.div>
  );
}
