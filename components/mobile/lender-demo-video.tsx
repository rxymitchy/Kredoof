"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DemoAppShot } from "@/components/mobile/demo-app-shot";
import { formatKsh } from "@/lib/format";
import { LEAD_FEE_KES } from "@/lib/loan-terms";

const DURATION_MS = 20000;
const TABS = ["Home", "Wallet", "Loans", "Files", "Profile", "Settings"];

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
    progress < 0.25
      ? "deposit"
      : progress < 0.5
        ? "file"
        : progress < 0.75
          ? "fund"
          : "given";

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-hairline bg-black text-white">
      <div className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[4/3] lg:aspect-video">
        <img
          src={
            scene === "fund" || scene === "given"
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
        <div className="absolute inset-x-0 top-10 bottom-12 flex items-center justify-center px-3 sm:px-8">
          {scene === "deposit" ? (
            <DemoAppShot tab="Wallet" tabs={TABS} title="Wallet">
              <div className="rounded-2xl border border-hairline bg-white p-3">
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="font-heading text-3xl font-bold tracking-[-0.05em] text-mint-deep">
                  {formatKsh(50000)}
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
            </DemoAppShot>
          ) : null}
          {scene === "file" ? (
            <DemoAppShot tab="Files" tabs={TABS} title="Files">
              <div className="rounded-2xl border border-hairline bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-sm font-bold">Qualified file</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Score 742 · you put in {formatKsh(25000)}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    offered
                  </span>
                </div>
                <div className="mt-3 rounded-2xl bg-mint-deep px-4 py-2.5 text-center text-sm font-bold text-white">
                  Take file · {formatKsh(LEAD_FEE_KES)}
                </div>
              </div>
            </DemoAppShot>
          ) : null}
          {scene === "fund" ? (
            <DemoAppShot tab="Files" tabs={TABS} title="Files">
              <div className="rounded-2xl border border-hairline bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-sm font-bold">Amina N.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Score 742 · {formatKsh(25000)}
                    </p>
                    <p className="font-mono mt-1 text-[11px] text-muted-foreground">
                      0x7B2...91a4
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    claimed
                  </span>
                </div>
                <div className="mt-3 rounded-2xl bg-mint-deep px-4 py-2.5 text-center text-sm font-bold text-white">
                  Send {formatKsh(25000)} as USDT
                </div>
              </div>
            </DemoAppShot>
          ) : null}
          {scene === "given" ? (
            <DemoAppShot tab="Loans" tabs={TABS} title="Loans">
              <div className="rounded-2xl border border-hairline bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Amina N.</p>
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
                    <dt className="text-muted-foreground">They send back</dt>
                    <dd>195.05 USDT</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Pay by</dt>
                    <dd>19 Nov 2026</dd>
                  </div>
                </dl>
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
        Demo clip of your side. Wallet and Files only show money and borrowers
        that are actually on the desk.
      </p>
    </section>
  );
}
