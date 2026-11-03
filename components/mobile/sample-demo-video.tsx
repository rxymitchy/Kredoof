"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { DemoAppShot } from "@/components/mobile/demo-app-shot";

const DURATION_MS = 20000;
const TABS = ["Home", "Wallet", "Loans", "Profile", "Settings"];

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
        <span className="absolute top-3 left-3 z-10 rounded-full bg-[#C24545] px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase">
          Sample
        </span>
        <div className="absolute inset-x-0 top-10 bottom-12 flex items-center justify-center px-4 sm:px-8">
          {scene === "connect" ? (
            <DemoAppShot tab="Wallet" tabs={TABS} title="Wallet">
              <div className="rounded-2xl border border-hairline bg-white p-3">
                <div className="grid grid-cols-3 gap-2">
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
            </DemoAppShot>
          ) : null}
          {scene === "payments" ? (
            <DemoAppShot tab="Wallet" tabs={TABS} title="Wallet">
              <div className="overflow-hidden rounded-2xl border border-hairline bg-white">
                {SAMPLE_ROWS.map((row) => (
                  <div
                    key={row.when + row.amount}
                    className="flex items-center justify-between border-b border-hairline px-3 py-2 last:border-0"
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
            </DemoAppShot>
          ) : null}
          {scene === "score" ? (
            <DemoAppShot tab="Home" tabs={TABS} title="Your credit">
              <div className="rounded-2xl border border-hairline bg-white p-3">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <ScoreRing score={742} ready size={96} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="display text-xl leading-none">742</span>
                      <span className="text-[9px] text-muted-foreground">of 850</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-mint-deep">Your score</p>
                    <p className="text-sm font-semibold">Strong</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-canvas px-3 py-2">
                    <div className="text-[10px] text-muted-foreground">Typical month</div>
                    <div className="text-sm font-medium">910.00 USDC</div>
                  </div>
                  <div className="rounded-xl bg-canvas px-3 py-2">
                    <div className="text-[10px] text-muted-foreground">Wallet age</div>
                    <div className="text-sm font-medium">14 months</div>
                  </div>
                </div>
              </div>
            </DemoAppShot>
          ) : null}
          {scene === "repay" ? (
            <DemoAppShot tab="Loans" tabs={TABS} title="Loans">
              <div className="rounded-2xl border border-hairline bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Loan received</p>
                    <p className="font-heading text-lg font-bold">193.20 USDT</p>
                    <p className="text-xs text-muted-foreground">≈ KES 25,000</p>
                  </div>
                  <span className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    Open
                  </span>
                </div>
                <dl className="mt-2 grid gap-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Interest</dt>
                    <dd>0.06% a day · 1.85 USDT</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Term</dt>
                    <dd>16 days</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Send back</dt>
                    <dd>195.05 USDT</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Pay by</dt>
                    <dd>19 Nov 2026</dd>
                  </div>
                </dl>
                <div className="mt-3 rounded-2xl bg-mint-deep px-4 py-2.5 text-center text-sm font-bold text-white">
                  Pay it back
                </div>
              </div>
            </DemoAppShot>
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
