"use client";

import { useEffect, useState } from "react";
import { PrimaryButton } from "@/components/mobile/ui";
import { cn } from "@/lib/utils";

export function TotpSetupPanel({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [secret, setSecret] = useState("");
  const [account, setAccount] = useState("");
  const [qr, setQr] = useState("");
  const [mode, setMode] = useState<"scan" | "key">("scan");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/totp/setup")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.alreadyOn || data.error) {
          setError(
            data.error ??
              "Turn off the current authenticator first, then set it up again."
          );
          return;
        }
        if (data.secret) {
          setSecret(data.secret);
          setAccount(data.account ?? "");
          setQr(typeof data.qrDataUrl === "string" ? data.qrDataUrl : "");
          setMode(data.qrDataUrl ? "scan" : "key");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not start authenticator setup.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/totp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "That code did not match.");
      return;
    }
    onDone();
  }

  return (
    <div className="mt-4 grid gap-3">
      <p className="text-sm text-muted-foreground">
        Add a new entry as Kredoof, then {account || "your email"}. Type the
        6-digit code to finish.
      </p>
      {secret ? (
        <div className="rounded-[14px] border border-hairline bg-canvas px-3.5 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("scan")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                mode === "scan"
                  ? "bg-mint-deep text-white"
                  : "border border-hairline text-muted-foreground"
              )}
            >
              Scan QR
            </button>
            <button
              type="button"
              onClick={() => setMode("key")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                mode === "key"
                  ? "bg-mint-deep text-white"
                  : "border border-hairline text-muted-foreground"
              )}
            >
              Type the key
            </button>
          </div>
          {mode === "scan" && qr ? (
            <div className="mt-3 flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt="Scan this QR with your authenticator app"
                width={192}
                height={192}
                className="h-48 w-48"
              />
            </div>
          ) : mode === "scan" ? (
            <p className="mt-3 text-sm text-muted-foreground">
              QR is not ready. Type the key instead.
            </p>
          ) : (
            <p className="mt-3 break-all font-mono text-sm tracking-wide">
              {secret}
            </p>
          )}
        </div>
      ) : null}
      {secret ? (
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="000000"
          maxLength={6}
          className="w-full rounded-[14px] border border-hairline bg-canvas px-3.5 py-3 text-center font-mono text-lg tracking-[0.4em] outline-none"
        />
      ) : null}
      {error ? <p className="text-sm text-[#C24545]">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton
          type="button"
          disabled={busy || !secret}
          className="sm:w-auto sm:px-6"
          onClick={() => void submit()}
        >
          {busy ? "Please wait…" : "Turn it on"}
        </PrimaryButton>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-semibold text-muted-foreground"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
