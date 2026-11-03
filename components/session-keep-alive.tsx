"use client";

import { useEffect } from "react";

const PING_GAP_MS = 20_000;

/** Extends the signed-in cookie while the person is actually using the page. */
export function SessionKeepAlive() {
  useEffect(() => {
    let lastPing = 0;
    const ping = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastPing < PING_GAP_MS) return;
      lastPing = now;
      void fetch("/api/auth/me", { credentials: "same-origin" });
    };
    const events = [
      "pointerdown",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ] as const;
    events.forEach((event) =>
      window.addEventListener(event, ping, { passive: true })
    );
    document.addEventListener("visibilitychange", ping);
    return () => {
      events.forEach((event) => window.removeEventListener(event, ping));
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);
  return null;
}
