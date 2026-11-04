"use client";

import { useState } from "react";

export function EmailVerifyBanner({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/auth/confirm/resend", {
      method: "POST",
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (data.alreadyVerified) {
      setNote("This inbox is already confirmed.");
      return;
    }
    if (!res.ok) {
      setNote(data.error ?? "Could not send that email.");
      return;
    }
    if (data.alreadySent) {
      setNote("We already sent a link. Check inbox and spam.");
      return;
    }
    setNote("New link sent. Check inbox and spam.");
  }

  return (
    <div className="rounded-[1.4rem] border border-[#E8D5A3] bg-[#FBF0DA] px-4 py-4">
      <p className="text-sm font-semibold text-foreground">Verify your email</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Confirm {email} when you can. You can keep using Kredoof in the meantime.
      </p>
      <button
        type="button"
        onClick={() => void resend()}
        disabled={busy}
        className="mt-3 text-sm font-semibold text-mint-deep disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send a new link"}
      </button>
      {note ? (
        <p
          className={
            note.startsWith("New link") || note.includes("already confirmed")
              ? "mt-2 text-xs text-muted-foreground"
              : "mt-2 text-xs font-medium text-[#C24545]"
          }
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
