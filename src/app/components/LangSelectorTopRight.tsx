'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useLang, LANG_OPTIONS, type LangCode } from './useLang';

export default function LangSelectorTopRight() {
  const pathname = usePathname();
  const { lang, setLang } = useLang();

  // ✅ show ONLY on homepage OR settings (if you have /settings route)
  const allowed = pathname === '/' || pathname.startsWith('/settings');
  if (!allowed) return null;

  const current = LANG_OPTIONS.find((l) => l.code === lang) ?? LANG_OPTIONS[0];

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white">
      <span className="text-lg leading-none">{current.flag}</span>

      {/* ✅ Make text visible ALWAYS: force text color */}
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as LangCode)}
        className="bg-transparent text-xs text-white outline-none"
      >
        {LANG_OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code} className="text-black">
            {opt.flag} {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}
