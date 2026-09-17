"use client";

import { Lock, Mail, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";
import { PrimaryButton } from "@/components/mobile/ui";
import {
  emailHint,
  identifierHint,
  nameHint,
  passwordHint,
  phoneHint,
  validateLogin,
  validateSignup,
} from "@/lib/account-rules";
import { cn } from "@/lib/utils";

export type AuthMode = "signin" | "signup" | "forgot" | "reset";

export function AuthForm({
  initialMode = "signup",
  initialError = null,
  resetToken = "",
  onContinue,
}: {
  initialMode?: AuthMode;
  initialError?: string | null;
  resetToken?: string;
  onContinue: () => void;
}) {
  const [mode, setAuthMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverEmailError, setServerEmailError] = useState<string | null>(
    null
  );
  const [serverPhoneError, setServerPhoneError] = useState<string | null>(
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
  const phoneError =
    serverPhoneError ?? (touched.phone ? phoneHint(phone) : null);
  const identifierError =
    serverEmailError ??
    (touched.identifier ? identifierHint(identifier) : null);
  const passwordError =
    serverPasswordError ?? (touched.password ? passwordHint(password) : null);
  const confirmError =
    mode === "reset" && touched.confirm && confirmPassword !== password
      ? "Passwords do not match"
      : null;

  function mark(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function switchMode(next: AuthMode) {
    setAuthMode(next);
    setError(null);
    setServerEmailError(null);
    setServerPasswordError(null);
    setServerPhoneError(null);
    setNotice(null);
    setTouched({});
    setPassword("");
    setConfirmPassword("");
  }

  async function submit() {
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      identifier: true,
      password: true,
      confirm: true,
    });
    setError(null);
    setServerEmailError(null);
    setServerPasswordError(null);
    setServerPhoneError(null);
    if (mode === "forgot") {
      const invalid = identifierHint(identifier);
      if (invalid) return;
      setBusy(true);
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      setBusy(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setServerEmailError(data.error ?? "Could not send a reset email");
        return;
      }
      setNotice(
        "If that account exists, we emailed a reset link. Check your inbox."
      );
      return;
    }
    if (mode === "reset") {
      const invalid = passwordHint(password);
      if (invalid) return;
      if (confirmPassword !== password) return;
      if (!resetToken) {
        setError("This reset link is missing. Request a new one.");
        return;
      }
      setBusy(true);
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const data = await res.json().catch(() => ({}));
      setBusy(false);
      if (!res.ok) {
        setError(data.error ?? "Could not reset that password");
        return;
      }
      switchMode("signin");
      setNotice("Password updated. Sign in with your new password.");
      return;
    }
    const localError =
      mode === "signup"
        ? validateSignup({ firstName, lastName, email, phone, password })
        : validateLogin({ identifier, password });
    if (localError) {
      return;
    }
    setBusy(true);
    const path = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        phone,
        identifier,
        password,
        firstName,
        lastName,
      }),
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
      } else if (data.field === "phone") {
        setServerPhoneError(message);
      } else if (data.field === "email" || /already exists/i.test(message)) {
        setServerEmailError(message);
      } else {
        setError(message);
      }
      return;
    }
    if (mode === "signup") {
      switchMode("signin");
      setEmail(email);
      setNotice(
        data.emailSent
          ? "Account created. Check your email for a confirmation link, or sign in with your password."
          : "Account created. Sign in with your email and password."
      );
      return;
    }
    onContinue();
  }

  const submitLabel =
    mode === "signin"
      ? "Sign in"
      : mode === "forgot"
        ? "Send reset link"
        : mode === "reset"
          ? "Update password"
          : "Sign up";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      noValidate
    >
      {mode === "signup" || mode === "signin" ? (
        <div className="mb-5 flex rounded-[14px] bg-[#F3F5F1] p-1">
          {(["signup", "signin"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
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
      ) : (
        <div className="mb-5">
          <h2 className="font-heading text-lg font-bold">
            {mode === "reset" ? "Choose a new password" : "Forgot password"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "reset"
              ? "Use at least 8 characters."
              : "We’ll email a reset link if that email or phone has an account."}
          </p>
        </div>
      )}
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
      {mode === "signup" ? (
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
      ) : null}
      {mode === "signup" ? (
        <div className="mb-3">
          <label
            className={cn(
              "flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3",
              phoneError ? "border-[#C24545]" : "border-hairline"
            )}
          >
            <Phone size={16} className="text-[#a9b0a2]" />
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setServerPhoneError(null);
              }}
              onBlur={() => mark("phone")}
              placeholder="0712 345 678"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          {phoneError ? (
            <p className="mt-1 text-xs text-[#C24545]">{phoneError}</p>
          ) : null}
        </div>
      ) : null}
      {mode === "signin" || mode === "forgot" ? (
        <div className="mb-3">
          <label
            className={cn(
              "flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3",
              identifierError ? "border-[#C24545]" : "border-hairline"
            )}
          >
            <Mail size={16} className="text-[#a9b0a2]" />
            <input
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setServerEmailError(null);
              }}
              onBlur={() => mark("identifier")}
              placeholder="Email or phone number"
              autoComplete="username"
              required
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          {identifierError ? (
            <p className="mt-1 text-xs text-[#C24545]">{identifierError}</p>
          ) : null}
        </div>
      ) : null}
      {mode !== "forgot" ? (
        <div className={mode === "signin" ? "mb-2" : "mb-5"}>
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
              placeholder={mode === "reset" ? "New password" : "Password"}
              minLength={8}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          {passwordError ? (
            <p className="mt-1 text-xs text-[#C24545]">{passwordError}</p>
          ) : null}
        </div>
      ) : null}
      {mode === "reset" ? (
        <div className="mb-5">
          <label
            className={cn(
              "flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3",
              confirmError ? "border-[#C24545]" : "border-hairline"
            )}
          >
            <Lock size={16} className="text-[#a9b0a2]" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => mark("confirm")}
              placeholder="Confirm password"
              minLength={8}
              autoComplete="new-password"
              required
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          {confirmError ? (
            <p className="mt-1 text-xs text-[#C24545]">{confirmError}</p>
          ) : null}
        </div>
      ) : null}
      {mode === "signin" ? (
        <button
          type="button"
          onClick={() => switchMode("forgot")}
          className="mb-5 block text-sm font-semibold text-mint-deep"
        >
          Forgot password?
        </button>
      ) : null}
      {notice ? (
        <p className="mb-3 text-sm text-[#1F5A34]">{notice}</p>
      ) : null}
      {error ? <p className="mb-3 text-sm text-[#C24545]">{error}</p> : null}
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? "Please wait…" : submitLabel}
      </PrimaryButton>
      {mode === "forgot" || mode === "reset" ? (
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className="mt-4 block w-full text-center text-sm text-muted-foreground"
        >
          Back to sign in
        </button>
      ) : null}
    </form>
  );
}
