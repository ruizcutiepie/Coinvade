// src/app/components/useLang.ts
'use client';

import { useState } from 'react';

/* ------------ language codes & options ------------ */

export type LangCode =
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'pt' // Portuguese (BR)
  | 'zh' // Chinese
  | 'jp' // Japanese
  | 'kr' // Korean
  | 'ph'; // Filipino

export const LANG_OPTIONS: {
  code: LangCode;
  name: string;
  flag: string;
}[] = [
  { code: 'en', name: 'English',   flag: '🇺🇸' },
  { code: 'es', name: 'Español',   flag: '🇪🇸' },
  { code: 'fr', name: 'Français',  flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch',   flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'zh', name: '中文',       flag: '🇨🇳' },
  { code: 'jp', name: '日本語',     flag: '🇯🇵' },
  { code: 'kr', name: '한국어',     flag: '🇰🇷' },
  { code: 'ph', name: 'Filipino',  flag: '🇵🇭' },
];

/* ------------ translations dictionary ------------ */

type Dict = Record<string, string>;

const BASE_EN: Dict = {
  // nav + balance
  'balance': 'Balance',
  'nav.verify': 'Verify',
  'nav.markets': 'Markets',
  'nav.trade': 'Trade',
  'nav.wallet': 'Wallet',

  // markets home page
  'markets.heading': 'Markets Overview',
  'markets.sub':
    'Hover over the map to explore live performance of major pairs. Click any tile to start a contract.',

  // trade page labels
  'trade.profitRate': 'profit rate',
  'trade.transactionMode': 'Transaction mode',
  'trade.openingQty': 'Opening quantity',
  'trade.accountLabel': 'Second contract account',
  'trade.inTransaction': 'In transaction',
  'trade.historyTab': 'History',
  'trade.noActive':
    'No active contracts. Start a trade with Buy(Long) or Sell(Short).',

  // buttons
  'btn.buyLong': 'Buy(Long)',
  'btn.sellShort': 'Sell(Short)',

  // confirm modal
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
  en: {
    ...BASE_EN,
  },

  es: {
    ...BASE_EN,
    'balance': 'Saldo',
    'nav.verify': 'Verificar',
    'nav.markets': 'Mercados',
    'nav.trade': 'Operar',
    'nav.wallet': 'Billetera',

    'markets.heading': 'Visión general de mercados',
    'markets.sub':
      'Pase el cursor sobre el mapa para explorar el rendimiento de los pares. Haga clic en cualquier ficha para abrir un contrato.',

    'trade.transactionMode': 'Modo de transacción',
    'trade.openingQty': 'Cantidad de apertura',
    'trade.accountLabel': 'Cuenta de contrato',
    'trade.inTransaction': 'En operación',
    'trade.historyTab': 'Historial',
    'trade.noActive':
      'No hay contratos activos. Inicie una operación con Comprar o Vender.',

    'btn.buyLong': 'Comprar (Long)',
    'btn.sellShort': 'Vender (Short)',

    'confirm.title': 'Confirmar operación',
    'confirm.summary':
      'Revise los detalles antes de iniciar este contrato.',
    'confirm.pair': 'Par',
    'confirm.direction': 'Dirección',
    'confirm.amount': 'Monto',
    'confirm.duration': 'Duración',
    'confirm.estimatedPayout': 'Pago estimado',
    'confirm.cancel': 'Cancelar',
    'confirm.submit': 'Confirmar e iniciar',
  },

  fr: {
    ...BASE_EN,
    'balance': 'Solde',
    'nav.verify': 'Vérifier',
    'nav.markets': 'Marchés',
    'nav.trade': 'Trading',
    'nav.wallet': 'Portefeuille',

    'markets.heading': 'Vue d’ensemble des marchés',
    'markets.sub':
      'Survolez la carte pour explorer la performance des principaux pairs. Cliquez sur une tuile pour ouvrir un contrat.',

    'trade.transactionMode': 'Mode de transaction',
    'trade.openingQty': 'Quantité d’ouverture',
    'trade.accountLabel': 'Compte de contrat',
    'trade.inTransaction': 'En position',
    'trade.historyTab': 'Historique',
    'trade.noActive':
      'Aucun contrat actif. Lancez un trade avec Achat(Long) ou Vente(Short).',

    'btn.buyLong': 'Acheter (Long)',
    'btn.sellShort': 'Vendre (Short)',

    'confirm.title': 'Confirmer le trade',
    'confirm.summary':
      'Veuillez vérifier les détails avant de démarrer ce contrat.',
    'confirm.pair': 'Pair',
    'confirm.direction': 'Direction',
    'confirm.amount': 'Montant',
    'confirm.duration': 'Durée',
    'confirm.estimatedPayout': 'Gain estimé',
    'confirm.cancel': 'Annuler',
    'confirm.submit': 'Confirmer et démarrer',
  },

  de: {
    ...BASE_EN,
    'balance': 'Kontostand',
    'nav.verify': 'Verifizieren',
    'nav.markets': 'Märkte',
    'nav.trade': 'Handel',
    'nav.wallet': 'Wallet',

    'markets.heading': 'Marktübersicht',
    'markets.sub':
      'Bewegen Sie die Maus über die Karte, um die Performance der Hauptpaare zu sehen. Klicken Sie auf eine Kachel, um einen Kontrakt zu starten.',

    'trade.transactionMode': 'Transaktionsmodus',
    'trade.openingQty': 'Eröffnungsmenge',
    'trade.accountLabel': 'Kontraktkonto',
    'trade.inTransaction': 'Im Handel',
    'trade.historyTab': 'Historie',
    'trade.noActive':
      'Keine aktiven Kontrakte. Starten Sie einen Trade mit Kaufen oder Verkaufen.',

    'btn.buyLong': 'Kaufen (Long)',
    'btn.sellShort': 'Verkaufen (Short)',

    'confirm.title': 'Trade bestätigen',
    'confirm.summary':
      'Bitte prüfen Sie die Details, bevor Sie diesen Kontrakt starten.',
    'confirm.pair': 'Paar',
    'confirm.direction': 'Richtung',
    'confirm.amount': 'Betrag',
    'confirm.duration': 'Dauer',
    'confirm.estimatedPayout': 'Geschätzte Auszahlung',
    'confirm.cancel': 'Abbrechen',
    'confirm.submit': 'Bestätigen & starten',
  },

  pt: {
    ...BASE_EN,
    'balance': 'Saldo',
    'nav.verify': 'Verificar',
    'nav.markets': 'Mercados',
    'nav.trade': 'Negociar',
    'nav.wallet': 'Carteira',

    'markets.heading': 'Visão geral dos mercados',
    'markets.sub':
      'Passe o mouse sobre o mapa para ver o desempenho dos principais pares. Clique em qualquer card para abrir um contrato.',

    'trade.transactionMode': 'Modo de transação',
    'trade.openingQty': 'Quantidade de abertura',
    'trade.accountLabel': 'Conta do contrato',
    'trade.inTransaction': 'Em operação',
    'trade.historyTab': 'Histórico',
    'trade.noActive':
      'Nenhum contrato ativo. Inicie um trade com Comprar ou Vender.',

    'btn.buyLong': 'Comprar (Long)',
    'btn.sellShort': 'Vender (Short)',

    'confirm.title': 'Confirmar trade',
    'confirm.summary':
      'Verifique os dados antes de iniciar este contrato.',
    'confirm.pair': 'Par',
    'confirm.direction': 'Direção',
    'confirm.amount': 'Valor',
    'confirm.duration': 'Duração',
    'confirm.estimatedPayout': 'Pagamento estimado',
    'confirm.cancel': 'Cancelar',
    'confirm.submit': 'Confirmar e iniciar',
  },

  zh: {
    ...BASE_EN,
    'balance': '余额',
    'nav.verify': '验证',
    'nav.markets': '市场',
    'nav.trade': '交易',
    'nav.wallet': '钱包',

    'markets.heading': '市场总览',
    'markets.sub':
      '将鼠标悬停在地图上浏览主要交易对的表现。点击任意卡片开始合约。',

    'trade.transactionMode': '交易模式',
    'trade.openingQty': '开仓数量',
    'trade.accountLabel': '合约账户',
    'trade.inTransaction': '进行中的合约',
    'trade.historyTab': '历史记录',
    'trade.noActive':
      '暂无进行中的合约。点击买入或卖出开始交易。',

    'btn.buyLong': '买入 (做多)',
    'btn.sellShort': '卖出 (做空)',

    'confirm.title': '确认交易',
    'confirm.summary': '开始合约前请确认以下信息。',
    'confirm.pair': '交易对',
    'confirm.direction': '方向',
    'confirm.amount': '金额',
    'confirm.duration': '时长',
    'confirm.estimatedPayout': '预计收益',
    'confirm.cancel': '取消',
    'confirm.submit': '确认并开始',
  },

  jp: {
    ...BASE_EN,
    'balance': '残高',
    'nav.verify': '認証',
    'nav.markets': 'マーケット',
    'nav.trade': 'トレード',
    'nav.wallet': 'ウォレット',

    'markets.heading': 'マーケット概要',
    'markets.sub':
      'マップ上にカーソルを置いて主要ペアのパフォーマンスを確認し、カードをクリックして契約を開始します。',

    'trade.transactionMode': '取引モード',
    'trade.openingQty': 'オープン数量',
    'trade.accountLabel': '契約アカウント',
    'trade.inTransaction': '取引中',
    'trade.historyTab': '履歴',
    'trade.noActive':
      'アクティブな契約はありません。買いまたは売りでトレードを開始してください。',

    'btn.buyLong': '買い (ロング)',
    'btn.sellShort': '売り (ショート)',

    'confirm.title': 'トレードの確認',
    'confirm.summary':
      'この契約を開始する前に内容を確認してください。',
    'confirm.pair': 'ペア',
    'confirm.direction': '方向',
    'confirm.amount': '数量',
    'confirm.duration': '期間',
    'confirm.estimatedPayout': '想定ペイアウト',
    'confirm.cancel': 'キャンセル',
    'confirm.submit': '確認して開始',
  },

  kr: {
    ...BASE_EN,
    'balance': '잔액',
    'nav.verify': '인증',
    'nav.markets': '마켓',
    'nav.trade': '트레이드',
    'nav.wallet': '지갑',

    'markets.heading': '마켓 개요',
    'markets.sub':
      '맵 위에 마우스를 올려 주요 페어의 성과를 확인하고, 카드 클릭으로 계약을 시작하세요.',

    'trade.transactionMode': '거래 모드',
    'trade.openingQty': '진입 수량',
    'trade.accountLabel': '계약 계정',
    'trade.inTransaction': '진행 중',
    'trade.historyTab': '히스토리',
    'trade.noActive':
      '진행 중인 계약이 없습니다. 매수 또는 매도로 거래를 시작하세요.',

    'btn.buyLong': '매수 (롱)',
    'btn.sellShort': '매도 (숏)',

    'confirm.title': '거래 확인',
    'confirm.summary':
      '계약을 시작하기 전에 아래 내용을 확인하세요.',
    'confirm.pair': '페어',
    'confirm.direction': '방향',
    'confirm.amount': '금액',
    'confirm.duration': '기간',
    'confirm.estimatedPayout': '예상 수익',
    'confirm.cancel': '취소',
    'confirm.submit': '확인 후 시작',
  },

  ph: {
    ...BASE_EN,
    'balance': 'Balanse',
    'nav.verify': 'I-verify',
    'nav.markets': 'Merkado',
    'nav.trade': 'Trade',
    'nav.wallet': 'Wallet',

    'markets.heading': 'Buod ng Merkado',
    'markets.sub':
      'I-hover ang mouse sa mapa para makita ang galaw ng mga pangunahing pares. I-click ang tile para magsimula ng kontrata.',

    'trade.transactionMode': 'Mode ng transaksyon',
    'trade.openingQty': 'Opening na halaga',
    'trade.accountLabel': 'Kontrata account',
    'trade.inTransaction': 'May bukas na kontrata',
    'trade.historyTab': 'History',
    'trade.noActive':
      'Walang aktibong kontrata. Puwede kang magsimula gamit ang Buy o Sell.',

    'btn.buyLong': 'Buy (Long)',
    'btn.sellShort': 'Sell (Short)',

    'confirm.title': 'Kumpirmahin ang trade',
    'confirm.summary':
      'Paki-review ang mga detalye bago simulan ang kontratang ito.',
    'confirm.pair': 'Pair',
    'confirm.direction': 'Direksyon',
    'confirm.amount': 'Halaga',
    'confirm.duration': 'Tagal',
    'confirm.estimatedPayout': 'Tinatayang payout',
    'confirm.cancel': 'Kanselahin',
    'confirm.submit': 'Kumpirmahin at simulan',
  },
};

/* ------------ hook + helper ------------ */

export function useLang() {
  const [lang, setLang] = useState<LangCode>('en');
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