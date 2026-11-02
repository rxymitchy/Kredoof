"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function ParallaxFrame({
  children,
  className,
  strength = 0.12,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 1023px)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        const mid = rect.top + rect.height / 2 - window.innerHeight / 2;
        node.style.transform = `translate3d(0, ${mid * strength * -1}px, 0)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [strength]);

  return (
    <div ref={ref} className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}

export function FilmStill({
  src,
  alt,
  className,
  imgClassName,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <img src={src} alt={alt} className={cn("ken-burns h-full w-full object-cover", imgClassName)} />
    </div>
  );
}
