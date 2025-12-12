// src/app/components/useLang.ts
'use client';

import { useEffect, useState } from 'react';

/* ------------ language codes & options ------------ */

export type LangCode =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt'
  | 'zh'
  | 'jp'
  | 'kr'
  | 'ph';

export const LANG_OPTIONS: {
  code: LangCode;
  name: string;
  flag: string;
}[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'jp', name: '日本語', flag: '🇯🇵' },
  { code: 'kr', name: '한국어', flag: '🇰🇷' },
  { code: 'ph', name: 'Filipino', flag: '🇵🇭' },
];

/* ------------ translations dictionary ------------ */

type Dict = Record<string, string>;

const BASE_EN: Dict = {
  'balance': 'Balance',
  'nav.verify': 'Verify',
  'nav.markets': 'Markets',
  'nav.trade': 'Trade',
  'nav.wallet': 'Wallet',

  'markets.heading': 'Markets Overview',
  'markets.sub':
    'Hover over the map to explore live performance of major pairs. Click any tile to start a contract.',

  'trade.profitRate': 'profit rate',
  'trade.transactionMode': 'Transaction mode',
  'trade.openingQty': 'Opening quantity',
  'trade.accountLabel': 'Second contract account',
  'trade.inTransaction': 'In transaction',
  'trade.historyTab': 'History',
  'trade.noActive':
    'No active contracts. Start a trade with Buy(Long) or Sell(Short).',

  'btn.buyLong': 'Buy(Long)',
  'btn.sellShort': 'Sell(Short)',

  'confirm.title': 'Confirm trade',
  'confirm.summary':
    'Please check the details below before starting this contract.',
  'confirm.pair': 'Pair',
  'confirm.direction': 'Direction',
  'confirm.amount': 'Amount',
  'confirm.duration': 'Duration',
  'confirm.estimatedPayout': 'Estimated payout',
  'confirm.cancel': 'Cancel',
  'confirm.submit': 'Confirm & start',
};

const DICTIONARY: Record<LangCode, Dict> = {
  en: { ...BASE_EN },
  es: {
    ...BASE_EN,
    'balance': 'Saldo',
    'nav.verify': 'Verificar',
    'nav.markets': 'Mercados',
    'nav.trade': 'Operar',
    'nav.wallet': 'Billetera',
  },
  fr: {
    ...BASE_EN,
    'balance': 'Solde',
    'nav.verify': 'Vérifier',
    'nav.markets': 'Marchés',
    'nav.trade': 'Trading',
    'nav.wallet': 'Portefeuille',
  },
  de: {
    ...BASE_EN,
    'balance': 'Kontostand',
    'nav.verify': 'Verifizieren',
    'nav.markets': 'Märkte',
    'nav.trade': 'Handel',
    'nav.wallet': 'Wallet',
  },
  pt: {
    ...BASE_EN,
    'balance': 'Saldo',
    'nav.verify': 'Verificar',
    'nav.markets': 'Mercados',
    'nav.trade': 'Negociar',
    'nav.wallet': 'Carteira',
  },
  zh: {
    ...BASE_EN,
    'balance': '余额',
    'nav.verify': '验证',
    'nav.markets': '市场',
    'nav.trade': '交易',
    'nav.wallet': '钱包',
  },
  jp: {
    ...BASE_EN,
    'balance': '残高',
    'nav.verify': '認証',
    'nav.markets': 'マーケット',
    'nav.trade': 'トレード',
    'nav.wallet': 'ウォレット',
  },
  kr: {
    ...BASE_EN,
    'balance': '잔액',
    'nav.verify': '인증',
    'nav.markets': '마켓',
    'nav.trade': '트레이드',
    'nav.wallet': '지갑',
  },
  ph: {
    ...BASE_EN,
    'balance': 'Balanse',
    'nav.verify': 'I-verify',
    'nav.markets': 'Merkado',
    'nav.trade': 'Trade',
    'nav.wallet': 'Wallet',
  },
};

const STORAGE_KEY = 'coinvade.lang';

/* ------------ hook + helper ------------ */

export function useLang() {
  const [lang, setLangState] = useState<LangCode>('en');

  // load once
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as LangCode | null;
      if (saved && DICTIONARY[saved]) setLangState(saved);
    } catch {}
  }, []);

  const setLang = (next: LangCode) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  return { lang, setLang };
}

/**
 * Translate a key for the current language.
 * Falls back to English, then to the key itself.
 */
export function tr(key: string, lang: LangCode): string {
  const dict = DICTIONARY[lang] ?? DICTIONARY.en;
  return dict[key] ?? DICTIONARY.en[key] ?? key;
}
