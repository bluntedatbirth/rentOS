'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';

const neonButtonVariants = cva(
  'relative group inline-flex items-center justify-center gap-2 border text-sm font-semibold transition-all duration-200 cursor-pointer no-underline disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-saffron-700 to-saffron-500 text-white border-saffron-500/20 hover:brightness-110 rounded-xl',
        secondary:
          'bg-warm-100/80 dark:bg-white/5 backdrop-blur-sm text-charcoal-700 dark:text-white/80 border-charcoal-200 dark:border-white/10 hover:bg-warm-200/80 dark:hover:bg-white/10 rounded-xl',
        outline:
          'bg-transparent text-charcoal-800 dark:text-white border-2 border-charcoal-800 dark:border-white/30 hover:bg-charcoal-800 dark:hover:bg-white/10 hover:text-warm-50 rounded-xl',
        ghost:
          'border-transparent bg-transparent text-charcoal-600 dark:text-white/80 hover:text-saffron-500 dark:hover:text-saffron-400 rounded-xl',
      },
      size: {
        default: 'px-7 py-3',
        sm: 'px-5 py-2',
        lg: 'px-8 py-3.5',
        full: 'w-full py-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface NeonButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>, VariantProps<typeof neonButtonVariants> {
  neon?: boolean;
  as?: 'a' | 'button';
}

const NeonButton = React.forwardRef<HTMLAnchorElement | HTMLButtonElement, NeonButtonProps>(
  ({ className, neon = true, size, variant, as, children, ...props }, ref) => {
    const isGhost = variant === 'ghost';
    const Tag = as === 'button' ? 'button' : 'a';

    return (
      <Tag
        className={cn(neonButtonVariants({ variant, size }), className)}
        ref={ref as React.Ref<HTMLAnchorElement & HTMLButtonElement>}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement> &
          React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {!isGhost && (
          <span
            className={cn(
              'absolute h-px opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out inset-x-0 inset-y-0 bg-gradient-to-r w-3/4 mx-auto from-transparent dark:via-saffron-400 via-saffron-600 to-transparent hidden',
              neon && 'block'
            )}
          />
        )}
        {children}
        {!isGhost && (
          <span
            className={cn(
              'absolute group-hover:opacity-30 transition-all duration-500 ease-in-out inset-x-0 h-px -bottom-px bg-gradient-to-r w-3/4 mx-auto from-transparent dark:via-saffron-400 via-saffron-600 to-transparent hidden',
              neon && 'block'
            )}
          />
        )}
      </Tag>
    );
  }
);

NeonButton.displayName = 'NeonButton';

export { NeonButton, neonButtonVariants };
