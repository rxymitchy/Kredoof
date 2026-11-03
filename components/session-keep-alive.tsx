"use client";

import { useEffect } from "react";
import { SESSION_TTL_SECONDS } from "@/lib/session-lifetime";

const PING_GAP_MS = 20_000;
const IDLE_MS = SESSION_TTL_SECONDS * 1000;
const IDLE_CHECK_MS = 5_000;

function onAppPage() {
  const path = window.location.pathname;
  return (
    path.startsWith("/dashboard") ||
    path.startsWith("/lend") ||
    path.startsWith("/onboard")
  );
}

/** Extends the cookie while they use the app. After 15 minutes idle, sign out and go Home. */
export function SessionKeepAlive() {
  useEffect(() => {
    let lastPing = 0;
    let lastActivity = Date.now();
    let sawSignedIn = false;
    let ended = false;

    const expire = () => {
      if (ended) return;
      ended = true;
      const goHome = onAppPage();
      void fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      }).finally(() => {
        if (goHome) {
          window.location.replace("/");
          return;
        }
        ended = false;
        sawSignedIn = false;
        lastActivity = Date.now();
      });
    };

    const checkIdle = () => {
      if (ended) return;
      if (Date.now() - lastActivity < IDLE_MS) return;
      if (!onAppPage() && !sawSignedIn) return;
      expire();
    };

    const ping = () => {
      if (ended) return;
      if (Date.now() - lastActivity >= IDLE_MS) {
        checkIdle();
        return;
      }
      if (document.visibilityState === "hidden") return;
      lastActivity = Date.now();
      const now = Date.now();
      if (now - lastPing < PING_GAP_MS) return;
      lastPing = now;
      void fetch("/api/auth/me", { credentials: "same-origin" })
        .then((res) => res.json())
        .then((data: { signedIn?: boolean }) => {
          if (ended) return;
          if (data.signedIn) {
            sawSignedIn = true;
            return;
          }
          if (sawSignedIn && onAppPage()) expire();
        })
        .catch(() => undefined);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") checkIdle();
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
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(checkIdle, IDLE_CHECK_MS);
    return () => {
      events.forEach((event) => window.removeEventListener(event, ping));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);
  return null;
}
