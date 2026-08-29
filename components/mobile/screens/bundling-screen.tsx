"use client";

import { CheckCircle2 } from "lucide-react";
import { PhoneShell } from "@/components/mobile/phone-shell";
import { Orb } from "@/components/mobile/ui";

export function BundlingScreen({
  doneCount,
  items,
}: {
  doneCount: number;
  items: string[];
}) {
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <PhoneShell>
      <div className="mx-auto max-w-xl rounded-3xl border border-hairline bg-white px-6 py-10 text-center sm:px-10">
        <div className="flex justify-center">
          <Orb spinning={pct < 100} size={128} />
        </div>
        <div className="font-heading mt-6 text-2xl font-bold">
          Analyzing your wallet
        </div>
        <div className="mb-6 mt-2 text-sm text-muted-foreground">
          Reading verified Avalanche records into a credit signal
        </div>
        <div className="mb-6 h-2 w-full rounded bg-hairline">
          <div
            className="h-2 rounded bg-mint-deep transition-[width] duration-400"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="w-full text-left">
          {items.map((item, i) => (
            <div
              key={item}
              className="flex items-center gap-3 py-2"
              style={{ opacity: i < doneCount ? 1 : 0.35 }}
            >
              {i < doneCount ? (
                <CheckCircle2 size={18} className="text-mint-deep" />
              ) : (
                <div className="h-[18px] w-[18px] rounded-full border-2 border-hairline" />
              )}
              <span className="text-sm sm:text-base">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
