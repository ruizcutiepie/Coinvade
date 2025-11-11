"use client";

import React, { useMemo } from "react";

export default function Sparkline({
  data,
  stroke = "rgb(34,197,94)",
  width = 400,
  height = 64,
  padding = 4,
}: {
  data: number[];
  stroke?: string;
  width?: number;
  height?: number;
  padding?: number;
}) {
  const d = useMemo(() => {
    if (!data || data.length < 2) return "";

    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;

    const innerW = width - padding * 2;
    const innerH = height - padding * 2;
    const stepX = innerW / (data.length - 1);

    const points = data.map((v, i) => {
      const x = padding + i * stepX;
      const y = padding + innerH - ((v - min) / span) * innerH; // invert Y
      return [x, y] as const;
    });

    let path = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i][0]} ${points[i][1]}`;
    }
    return path;
  }, [data, width, height, padding]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 6px rgba(34,197,94,0.35))" }}
      />
    </svg>
  );
}
