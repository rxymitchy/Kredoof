const BLOCKS = [
  { x: 6, y: 38, w: 8, h: 22, d: 0 },
  { x: 16, y: 46, w: 10, h: 24, d: 80 },
  { x: 28, y: 34, w: 7, h: 32, d: 140 },
  { x: 38, y: 50, w: 12, h: 16, d: 40 },
  { x: 52, y: 40, w: 9, h: 26, d: 180 },
  { x: 64, y: 48, w: 8, h: 18, d: 90 },
  { x: 74, y: 32, w: 11, h: 34, d: 160 },
  { x: 88, y: 44, w: 7, h: 22, d: 20 },
  { x: 12, y: 60, w: 14, h: 12, d: 220 },
  { x: 44, y: 58, w: 16, h: 14, d: 110 },
  { x: 70, y: 62, w: 10, h: 14, d: 200 },
];

export function WorldBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_110%,rgba(20,122,67,0.14),transparent_54%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-8%,rgba(247,248,246,0.96),transparent_46%)]" />
      <div className="world-iso absolute inset-x-[-12%] bottom-[-10%] top-[22%] opacity-80">
        {BLOCKS.map((block, i) => (
          <div
            key={i}
            className="world-block"
            style={{
              left: `${block.x}%`,
              bottom: `${block.y - 36}%`,
              width: `${block.w}%`,
              height: `${block.h}%`,
              animationDelay: `${block.d}ms`,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-canvas via-canvas/75 to-transparent" />
    </div>
  );
}
