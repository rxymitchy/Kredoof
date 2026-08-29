import { cn } from "@/lib/utils";

export function Avatar({
  initials,
  size = 40,
  active = false,
}: {
  initials: string;
  size?: number;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center font-heading font-bold transition-all",
        active
          ? "border-2 border-[#8FD9A4] text-[#1F5A34]"
          : "border-2 border-transparent text-muted-foreground"
      )}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        fontSize: size * 0.36,
        background: active
          ? "linear-gradient(135deg, #DDF3D6, #8FD9A4)"
          : "#EEF1EC",
      }}
    >
      {initials}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "font-heading w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground",
        disabled && "cursor-default opacity-55",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Orb({
  spinning,
  size = 108,
}: {
  spinning?: boolean;
  size?: number;
}) {
  return (
    <div
      className={cn("orb-face rounded-full", spinning ? "orb-spin" : "orb-idle")}
      style={{
        width: size,
        height: size,
        boxShadow: spinning
          ? "0 20px 40px -12px rgba(63,166,92,0.45)"
          : undefined,
      }}
    />
  );
}
