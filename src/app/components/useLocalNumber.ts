// src/app/components/useLocalNumber.ts
'use client';

import { useEffect, useState } from 'react';

export default function useLocalNumber(key: string, initial: number) {
  const [value, setValue] = useState<number>(() => {
    if (typeof window === 'undefined') return initial;
    const raw = window.localStorage.getItem(key);
    const num = raw != null ? Number(raw) : initial;
    return Number.isFinite(num) ? num : initial;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}
