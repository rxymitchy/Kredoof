import type { ReactNode } from "react";

export function DemoAppShot({
  tab,
  title,
  children,
}: {
  tab: string;
  tabs?: string[];
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-[1.4rem] border border-hairline bg-white text-foreground shadow-xl">
      <div className="px-4 pt-3">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-mint-deep uppercase">
          {tab}
        </p>
        <p className="text-lg font-semibold tracking-[-0.04em]">{title}</p>
      </div>
      <div className="p-3 pt-2">{children}</div>
    </div>
  );
}
