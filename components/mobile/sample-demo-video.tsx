"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DURATION_MS = 20000;

const SAMPLE_ROWS = [
  { kind: "in" as const, amount: "2,450.00 USDT", kes: "KSh 316,030", when: "21 Aug" },
  { kind: "out" as const, amount: "180.00 USDT", kes: "KSh 23,292", when: "18 Aug" },
  { kind: "in" as const, amount: "910.00 USDC", kes: "KSh 117,754", when: "12 Aug" },
  { kind: "out" as const, amount: "65.00 USDT", kes: "KSh 8,411", when: "9 Aug" },
];

function clock(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function SampleDemoVideo() {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const origin = performance.now() - elapsedRef.current;
    const timer = window.setInterval(() => {
      const next = (performance.now() - origin) % DURATION_MS;
      elapsedRef.current = next;
      setElapsed(next);
    }, 80);
    return () => window.clearInterval(timer);
  }, [playing]);

  const progress = elapsed / DURATION_MS;
  const scene =
    progress < 0.22
      ? "connect"
      : progress < 0.48
        ? "payments"
        : progress < 0.72
          ? "score"
          : "repay";

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-hairline bg-black text-white">
      <div className="relative aspect-video w-full overflow-hidden">
        <img
          src={
            scene === "score" || scene === "repay"
              ? "/images/count.jpg"
              : "/images/hero.jpg"
          }
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25" />
        <span className="absolute top-3 left-3 rounded-full bg-[#C24545] px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase">
          Sample
        </span>
        <div className="absolute inset-x-0 top-10 bottom-12 flex items-center justify-center px-4 sm:px-8">
          {scene === "connect" ? (
            <div className="w-full max-w-md rounded-2xl bg-white/95 p-4 text-foreground shadow-xl">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-mint-deep uppercase">
                Step 1
              </p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.04em]">
                Connect a wallet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                MetaMask, Core, or Trust — Avalanche only.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {["MetaMask", "Core", "Trust"].map((label) => (
                  <div
                    key={label}
                    className="rounded-xl bg-mint-deep px-2 py-3 text-center text-xs font-semibold text-white"
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {scene === "payments" ? (
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white/95 text-foreground shadow-xl">
              <p className="border-b border-hairline px-4 py-2 text-[10px] font-semibold tracking-[0.14em] text-mint-deep uppercase">
                Sample payments — not your wallet
              </p>
              {SAMPLE_ROWS.map((row) => (
                <div
                  key={row.when + row.amount}
                  className="flex items-center justify-between border-b border-hairline px-4 py-2.5 last:border-0"
                >
                  <span className="text-sm">
                    {row.kind === "in" ? "Money in" : "Money out"}
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                      {row.when}
                    </span>
                  </span>
                  <span
                    className="text-right text-xs font-semibold"
                    style={{ color: row.kind === "in" ? "#3FA65C" : "#C24545" }}
                  >
                    {row.kind === "in" ? "+" : "−"}
                    {row.amount}
                    <span className="mt-0.5 block font-normal text-muted-foreground">
                      {row.kes}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {scene === "score" ? (
            <div className="w-full max-w-md rounded-2xl bg-white/95 p-5 text-foreground shadow-xl">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-mint-deep uppercase">
                Step 3 · sample score
              </p>
              <p className="font-heading mt-2 text-5xl font-bold tracking-[-0.06em]">
                742
                <span className="ml-1 text-lg font-medium text-muted-foreground">
                  / 850
                </span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                This number is only in the demo. Yours is calculated after a
                real wallet is connected. 742 unlocks the 30-day payback.
              </p>
            </div>
          ) : null}
          {scene === "repay" ? (
            <div className="w-full max-w-md rounded-2xl bg-white/95 p-4 text-foreground shadow-xl">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-mint-deep uppercase">
                Sample loan — not yours
              </p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.04em]">
                Pay back in 16 or 30 days
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Interest is 0.06% a day. 16 days is the standard term. 30 days
                opens when the score is strong or a loan was already repaid.
              </p>
            </div>
          ) : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-black/70 px-3 py-2">
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15"
            aria-label={playing ? "Pause sample video" : "Play sample video"}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <span className="w-10 font-mono text-[10px] text-white/80">
            {clock(elapsed)}
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-[#8FD9A4]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-white/80">
            {clock(DURATION_MS)}
          </span>
        </div>
      </div>
      <p className="bg-[#12261a] px-5 py-3 text-xs leading-5 text-white/70">
        Demo clip only. Wallet shows Avalanche USDT and USDC that actually
        moved on the address you connect.
      </p>
    </section>
  );
}
