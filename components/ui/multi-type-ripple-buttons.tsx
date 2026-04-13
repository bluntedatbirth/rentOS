'use client';

import React, { ReactNode, useState, MouseEvent, CSSProperties } from 'react';

interface RippleState {
  key: number;
  x: number;
  y: number;
  size: number;
}

interface RippleButtonProps {
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  disabled?: boolean;
  rippleDuration?: number;
}

const JS_RIPPLE_KEYFRAMES = `
  @keyframes js-ripple-animation {
    0% { transform: scale(0); opacity: 1; }
    100% { transform: scale(1); opacity: 0; }
  }
  .animate-js-ripple-effect {
    animation: js-ripple-animation var(--ripple-duration) ease-out forwards;
  }
`;

export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  onClick,
  className = '',
  disabled = false,
  rippleDuration = 600,
}) => {
  const [ripples, setRipples] = useState<RippleState[]>([]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    const newRipple: RippleState = { key: Date.now(), x, y, size };
    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((current) => current.filter((r) => r.key !== newRipple.key));
    }, rippleDuration);
    if (onClick) onClick(event);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: JS_RIPPLE_KEYFRAMES }} />
      <button
        className={`relative overflow-hidden isolate transition-all duration-200 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        onClick={handleClick}
        disabled={disabled}
      >
        <span className="relative z-[1] pointer-events-none">{children}</span>
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {ripples.map((ripple) => (
            <span
              key={ripple.key}
              className="absolute rounded-full animate-js-ripple-effect bg-white/30"
              style={
                {
                  left: ripple.x,
                  top: ripple.y,
                  width: ripple.size,
                  height: ripple.size,
                  '--ripple-duration': `${rippleDuration}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </button>
    </>
  );
};
