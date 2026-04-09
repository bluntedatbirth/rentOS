'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';

export function NotificationBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications/count');
        if (res.ok) {
          const data = await res.json();
          setCount(data.count ?? 0);
        }
      } catch {
        // Silently fail on network errors
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (count <= 0) return null;

  return (
    <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}
