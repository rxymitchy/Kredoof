"use client";

import { Lock, Mail, User } from "lucide-react";
import { useEffect, useState } from "react";
import { PrimaryButton } from "@/components/mobile/ui";
import {
  emailHint,
  nameHint,
  passwordHint,
  validateLogin,
  validateSignup,
} from "@/lib/account-rules";
import { cn } from "@/lib/utils";

export function AuthForm({
  initialMode = "signup",
  initialError = null,
  onContinue,
}: {
  initialMode?: "signin" | "signup";
  initialError?: string | null;
  onContinue: () => void;
}) {
  const [mode, setAuthMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverEmailError, setServerEmailError] = useState<string | null>(
    null
  );
  const [serverPasswordError, setServerPasswordError] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  const firstNameError = touched.firstName
    ? nameHint(firstName, "first name")
    : null;
  const lastNameError = touched.lastName
    ? nameHint(lastName, "last name")
    : null;
  const emailError =
    serverEmailError ?? (touched.email ? emailHint(email) : null);
  const passwordError =
    serverPasswordError ?? (touched.password ? passwordHint(password) : null);

  function mark(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function submit() {
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
    });
    setError(null);
    setServerEmailError(null);
    setServerPasswordError(null);
    const localError =
      mode === "signup"
        ? validateSignup({ firstName, lastName, email, password })
        : validateLogin({ email, password });
    if (localError) {
      return;
    }
    setBusy(true);
    const path = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const message =
        typeof data.detail === "string"
          ? data.detail
          : data.error ?? "Could not save that account";
      if (mode === "signin" && data.field === "password") {
        setServerPasswordError(message);
      } else if (data.field === "email" || /already exists/i.test(message)) {
        setServerEmailError(message);
      } else {
        setError(message);
      }
      return;
    }
    if (mode === "signup") {
      setAuthMode("signin");
      setPassword("");
      setTouched({});
      setNotice(
        data.emailSent
          ? "Account created. Check your email for a confirmation link, or sign in with your password."
          : "Account created. Sign in with your email and password."
      );
      return;
    }
    onContinue();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      noValidate
    >
      <div className="mb-5 flex rounded-[14px] bg-[#F3F5F1] p-1">
        {(["signup", "signin"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setAuthMode(m);
              setError(null);
              setServerEmailError(null);
              setServerPasswordError(null);
              setNotice(null);
              setTouched({});
            }}
            className={cn(
              "font-heading flex-1 rounded-[10px] py-2.5 text-sm font-bold",
              mode === m
                ? "bg-white text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                : "text-[#a9b0a2]"
            )}
          >
            {m === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>
      {mode === "signup" ? (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label
              className={cn(
                "flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3",
                firstNameError ? "border-[#C24545]" : "border-hairline"
              )}
            >
              <User size={16} className="shrink-0 text-[#a9b0a2]" />
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={() => mark("firstName")}
                placeholder="First name"
                autoComplete="given-name"
                required
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            {firstNameError ? (
              <p className="mt-1 text-xs text-[#C24545]">{firstNameError}</p>
            ) : null}
          </div>
          <div>
            <label
              className={cn(
                "flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3",
                lastNameError ? "border-[#C24545]" : "border-hairline"
              )}
            >
              <User size={16} className="shrink-0 text-[#a9b0a2]" />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={() => mark("lastName")}
                placeholder="Last name"
                autoComplete="family-name"
                required
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            {lastNameError ? (
              <p className="mt-1 text-xs text-[#C24545]">{lastNameError}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="mb-3">
        <label
          className={cn(
            "flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3",
            emailError ? "border-[#C24545]" : "border-hairline"
          )}
        >
          <Mail size={16} className="text-[#a9b0a2]" />
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setServerEmailError(null);
            }}
            onBlur={() => mark("email")}
            placeholder="you@gmail.com"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        {emailError ? (
          <p className="mt-1 text-xs text-[#C24545]">{emailError}</p>
        ) : null}
      </div>
      <div className="mb-5">
        <label
          className={cn(
            "flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3",
            passwordError ? "border-[#C24545]" : "border-hairline"
          )}
        >
          <Lock size={16} className="text-[#a9b0a2]" />
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setServerPasswordError(null);
            }}
            onBlur={() => mark("password")}
            placeholder="Password"
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        {passwordError ? (
          <p className="mt-1 text-xs text-[#C24545]">{passwordError}</p>
        ) : null}
      </div>
      {notice ? (
        <p className="mb-3 text-sm text-[#1F5A34]">{notice}</p>
      ) : null}
      {error ? <p className="mb-3 text-sm text-[#C24545]">{error}</p> : null}
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
      </PrimaryButton>
    </form>
  );
}
