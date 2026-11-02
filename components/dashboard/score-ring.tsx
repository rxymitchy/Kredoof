export function ScoreRing({
  score,
  max = 850,
  size = 168,
  ready = true,
}: {
  score: number;
  max?: number;
  size?: number;
  ready?: boolean;
}) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const t = ready ? Math.min(1, Math.max(0, score / max)) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="score-ring">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e5eee7"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#147a43"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - t)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
