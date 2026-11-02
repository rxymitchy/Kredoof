import type { FlowPoint } from "@/types";

export function FlowChart({ points }: { points: FlowPoint[] }) {
  const rows = points.slice(-8);
  if (rows.length < 2) return null;
  const peak = Math.max(
    1,
    ...rows.flatMap((p) => [p.inflowsKsh, p.outflowsKsh])
  );
  const w = 320;
  const h = 88;
  const step = w / (rows.length - 1);
  const to = (values: number[]) =>
    values
      .map((v, i) => {
        const x = i * step;
        const y = h - (v / peak) * (h - 8) - 4;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  const inn = to(rows.map((p) => p.inflowsKsh));
  const out = to(rows.map((p) => p.outflowsKsh));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" aria-hidden>
      <path d={out} fill="none" stroke="#c24545" strokeWidth="2" opacity="0.55" />
      <path d={inn} fill="none" stroke="#2f8f52" strokeWidth="2.4" />
    </svg>
  );
}
