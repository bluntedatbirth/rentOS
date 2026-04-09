'use client';

import { useState, useCallback } from 'react';
import { createElement } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';

export function useProGate(feature: string) {
  const { profile } = useAuth();
  const [showingPrompt, setShowingPrompt] = useState(false);

  const defer = process.env.NEXT_PUBLIC_DEFER_TIER_ENFORCEMENT === 'true';
  const tier = profile?.tier ?? 'free';
  const allowed = defer || tier === 'pro';

  const showPrompt = useCallback(() => {
    if (!allowed) setShowingPrompt(true);
  }, [allowed]);

  const gate = useCallback(
    (action: () => void) => {
      if (allowed) {
        action();
      } else {
        setShowingPrompt(true);
      }
    },
    [allowed]
  );

  const PromptModal = showingPrompt
    ? createElement(UpgradePrompt, {
        feature,
        onDismiss: () => setShowingPrompt(false),
      })
    : null;

  return { allowed, showPrompt, gate, PromptModal };
}
