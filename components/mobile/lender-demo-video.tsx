"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatKsh } from "@/lib/format";
import { DAILY_INTEREST_LABEL, LEAD_FEE_KES, SHORT_TERM_DAYS } from "@/lib/loan-terms";

const DURATION_MS = 18000;

function clock(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function LenderDemoVideo() {
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
    progress < 0.32 ? "deposit" : progress < 0.66 ? "file" : "fund";

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-hairline bg-black text-white">
      <div className="relative aspect-video w-full overflow-hidden">
        <img
          src={scene === "fund" ? "/images/count.jpg" : "/images/hero.jpg"}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25" />
        <span className="absolute top-3 left-3 rounded-full bg-[#C24545] px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase">
          Sample
        </span>
        <div className="absolute inset-x-0 top-10 bottom-12 flex items-center justify-center px-4 sm:px-8">
          {scene === "deposit" ? (
            <div className="w-full max-w-md rounded-2xl bg-white/95 p-4 text-foreground shadow-xl">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-mint-deep uppercase">
                Step 1 · your float
              </p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.04em]">
                Deposit real money
              </p>
              <p className="font-heading mt-2 text-4xl font-bold tracking-[-0.05em] text-mint-deep">
                {formatKsh(50000)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sample balance only. Yours stays empty until M-Pesa or Avalanche USDT
                actually arrives.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {["M-Pesa", "Avalanche USDT"].map((label) => (
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
          {scene === "file" ? (
            <div className="w-full max-w-md rounded-2xl bg-white/95 p-4 text-foreground shadow-xl">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-mint-deep uppercase">
                Step 2 · take a file
              </p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.04em]">
                Qualified file
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sample score 742 · you would put in {formatKsh(25000)}
              </p>
              <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-sm">
                Exclusive look costs {formatKsh(LEAD_FEE_KES)} from your float.
                Wallet address shows after you take it — not before.
              </p>
            </div>
          ) : null}
          {scene === "fund" ? (
            <div className="w-full max-w-md rounded-2xl bg-white/95 p-4 text-foreground shadow-xl">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-mint-deep uppercase">
                Step 3 · send USDT
              </p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.04em]">
                You think in shillings
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                They receive USDT on Avalanche. Daily interest {DAILY_INTEREST_LABEL}{" "}
                is yours over {SHORT_TERM_DAYS} days. Kredoof takes 1% only when you
                fund.
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
        Demo clip of your side. Wallet and Files only show money and borrowers
        that are actually on the desk.
      </p>
    </section>
  );
}
