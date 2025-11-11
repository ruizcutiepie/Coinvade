"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  /** e.g. "BTCUSDT", "ETHUSDT", "SOLUSDT" */
  symbol: string;
};

type PriceResponse = { price: number; percent?: number } | { error: string };

const CARD_POLL_MS = 5000; // poll every 5s
const HISTORY_LEN = 40;    // how many points to keep for sparkline

export default function TickerCard({ symbol }: Props) {
  const [price, setPrice] = useState<number | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const timerRef = useRef<number | null>(null);

  // "BTCUSDT" -> "BTC/USDT"
  const label = useMemo(() => {
    const base = symbol.replace("USDT", "");
    return `${base}/USDT`;
  }, [symbol]);

  // fetch once and then every 5s
  useEffect(() => {
    let abort = false;

    const fetchOnce = async () => {
      try {
        const r = await fetch(`/api/price?symbol=${symbol}`, { cache: "no-store" });
        const data: PriceResponse = await r.json();

        if ("error" in data) return; // silent fail (bad gateway, etc.)
        if (abort) return;

        setPrice(data.price);
        setPercent(typeof data.percent === "number" ? data.percent : null);

        // build rolling spark history locally from live price
        setHistory((h) => {
          const next = [...h, data.price];
          if (next.length > HISTORY_LEN) next.shift();
          return next;
        });
      } catch {
        /* ignore; transient network errors already handled by proxy */
      }
    };

    fetchOnce();
    timerRef.current = window.setInterval(fetchOnce, CARD_POLL_MS);

    return () => {
      abort = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [symbol]);

  // compute sparkline path
  const { path, fillPath, up } = useMemo(() => {
    const w = 220; // SVG width
    const h = 60;  // SVG height
    const pad = 2;

    if (history.length < 2) {
      return { path: "", fillPath: "", up: true };
    }

    const min = Math.min(...history);
    const max = Math.max(...history);
    const span = max - min || 1; // avoid div/0 when flat

    const points = history.map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / (history.length - 1);
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return [x, y] as const;
    });

    const d =
      "M " +
      points
        .map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`)
        .join(" L ");

    // area under curve for subtle glow
    const fillD =
      d +
      ` L ${points.at(-1)![0].toFixed(2)} ${h - pad} L ${points[0][0].toFixed(
        2
      )} ${h - pad} Z`;

    const isUp = history[history.length - 1] >= history[0];
    return { path: d, fillPath: fillD, up: isUp };
  }, [history]);

  const priceText =
    price == null ? "…" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(price);

  const percentText =
    percent == null
      ? ""
      : `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;

  return (
    <div className="rounded-2xl border border-white/10 p-6 bg-[var(--surface)] shadow-lg neon-ring">
      {/* header row */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{label}</h3>
        <button className="text-white/50 hover:text-white transition">⋯</button>
      </div>

      {/* price + sparkline */}
      <div className="flex items-center gap-6">
        <div className="min-w-[140px]">
          <div className="text-3xl font-semibold">{priceText}</div>
          <div
            className={`mt-1 text-sm font-medium ${
              (percent ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {percentText}
          </div>
        </div>

        {/* SVG sparkline */}
        <svg
          width="220"
          height="60"
          viewBox="0 0 220 60"
          className="flex-1"
          aria-hidden="true"
        >
          {/* soft area */}
          {fillPath && (
            <path
              d={fillPath}
              fill={up ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)"}
            />
          )}
          {/* line */}
          {path && (
            <path
              d={path}
              fill="none"
              stroke={up ? "rgb(16,185,129)" : "rgb(244,63,94)"}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ filter: "drop-shadow(0 0 6px rgba(0,224,255,.25))" }}
            />
          )}
        </svg>
      </div>

      {/* footer */}
      <div className="mt-4 text-xs text-white/50">
        Live feed via proxy <span className="text-white/60">/api/price</span>
      </div>
    </div>
  );
}
