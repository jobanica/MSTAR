"use client";

import { useMemo, useRef, useState } from "react";

type Point = { label: string; value: number }; // value in centavos

const peso = (c: number) =>
  "₱" + (c / 100).toLocaleString("en-PH", { maximumFractionDigits: 0 });

const W = 720;
const H = 260;
const PAD = { top: 20, right: 16, bottom: 28, left: 52 };

export function RevenueChart({ points }: { points: Point[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const geom = useMemo(() => {
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const max = Math.max(1, ...points.map((p) => p.value));
    // round the axis top up to a "nice" number
    const niceMax = niceCeil(max);
    const n = points.length;

    const x = (i: number) =>
      PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = (v: number) => PAD.top + plotH - (v / niceMax) * plotH;

    const coords = points.map((p, i) => ({ ...p, cx: x(i), cy: y(p.value) }));
    const line = coords.map((c, i) => `${i ? "L" : "M"}${c.cx},${c.cy}`).join(" ");
    const area =
      `M${coords[0]?.cx ?? PAD.left},${PAD.top + plotH} ` +
      coords.map((c) => `L${c.cx},${c.cy}`).join(" ") +
      ` L${coords[coords.length - 1]?.cx ?? PAD.left},${PAD.top + plotH} Z`;

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      v: niceMax * f,
      y: PAD.top + plotH - f * plotH,
    }));

    return { coords, line, area, ticks, baseline: PAD.top + plotH };
  }, [points]);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || geom.coords.length === 0) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    geom.coords.forEach((c, i) => {
      const d = Math.abs(c.cx - px);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  const active = hover != null ? geom.coords[hover] : null;

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: "auto" }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Monthly revenue"
      >
        <defs>
          <linearGradient id="revfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* gridlines + y labels */}
        {geom.ticks.map((t) => (
          <g key={t.y}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={t.y}
              y2={t.y}
              stroke="#eef2f1"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 10}
              y={t.y + 3}
              textAnchor="end"
              className="fill-slate-400"
              fontSize={10}
            >
              {t.v >= 1000_00 ? `₱${Math.round(t.v / 100000)}k` : peso(t.v)}
            </text>
          </g>
        ))}

        {/* area + line */}
        <path d={geom.area} fill="url(#revfill)" />
        <path
          d={geom.line}
          fill="none"
          stroke="#0f766e"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* x labels */}
        {geom.coords.map((c, i) => (
          <text
            key={c.label + i}
            x={c.cx}
            y={H - 8}
            textAnchor="middle"
            className="fill-slate-400"
            fontSize={10}
          >
            {c.label}
          </text>
        ))}

        {/* hover crosshair + marker */}
        {active && (
          <g>
            <line
              x1={active.cx}
              x2={active.cx}
              y1={PAD.top}
              y2={geom.baseline}
              stroke="#0f766e"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
            />
            <circle
              cx={active.cx}
              cy={active.cy}
              r={5}
              fill="#0f766e"
              stroke="#fff"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center shadow-lg"
          style={{
            left: `${(active.cx / W) * 100}%`,
            top: `${(active.cy / H) * 100}%`,
            transform: "translate(-50%, -130%)",
          }}
        >
          <div className="text-sm font-semibold text-white">
            {peso(active.value)}
          </div>
          <div className="text-[10px] text-slate-300">{active.label}</div>
        </div>
      )}
    </div>
  );
}

function niceCeil(n: number) {
  if (n <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const norm = n / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}
