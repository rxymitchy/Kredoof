"use client";

import { parseAccountRole, type AccountRole } from "@/lib/account-role";
import { Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
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

export type AuthMode =
  | "signin"
  | "signup"
  | "forgot"
  | "reset"
  | "confirm"
  | "totp"
  | "totp-setup";

export function AuthForm({
  initialMode = "signup",
  initialError = null,
  initialNotice = null,
  resetToken = "",
  initialRole = "borrower",
  onContinue,
  onModeChange,
}: {
  initialMode?: AuthMode;
  initialError?: string | null;
  initialNotice?: string | null;
  resetToken?: string;
  initialRole?: AccountRole;
  onContinue: (role: AccountRole) => void;
  onModeChange?: (mode: AuthMode) => void;
}) {
  const [mode, setAuthMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<AccountRole>(parseAccountRole(initialRole));
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
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpAccount, setTotpAccount] = useState("");
  const [totpQr, setTotpQr] = useState("");
  const [totpAddMode, setTotpAddMode] = useState<"scan" | "key">("scan");
  const [linkToken, setLinkToken] = useState(resetToken);

  function applyTotpSetup(data: {
    secret?: string;
    account?: string;
    email?: string;
    qrDataUrl?: string;
  }) {
    if (!data.secret) return;
    setTotpSecret(data.secret);
    setTotpAccount(
      data.account ?? (data.email ? `Kredoof : ${data.email}` : "")
    );
    setTotpQr(typeof data.qrDataUrl === "string" ? data.qrDataUrl : "");
    setTotpAddMode(data.qrDataUrl ? "scan" : "key");
  }

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    setLinkToken(resetToken);
  }, [resetToken]);

  useEffect(() => {
    setRole(parseAccountRole(initialRole));
  }, [initialRole]);

  useEffect(() => {
    if (initialMode !== "totp-setup") return;
    let cancelled = false;
    fetch("/api/auth/totp/setup")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.alreadyOn) {
          setError(
            data.error ??
              "Turn off the current authenticator in Settings first."
          );
        } else if (data.secret) {
          applyTotpSetup(data);
        } else if (data.enroll === false) {
          switchMode("totp");
        } else if (data.error) {
          setError(data.error);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not start two-step sign-in.");
      });
    return () => {
      cancelled = true;
    };
    // switchMode is stable enough for this mount path
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    onModeChange?.(next);
    setError(null);
    setServerEmailError(null);
    setServerPasswordError(null);
    setServerPhoneError(null);
    setNotice(null);
    setTouched({});
    setPassword("");
    setConfirmPassword("");
    setTotpCode("");
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
    if (mode === "confirm") {
      if (!linkToken) {
        setError("This confirmation link is missing. Request a new one by signing in.");
        return;
      }
      setBusy(true);
      const res = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: linkToken }),
      });
      const data = await res.json().catch(() => ({}));
      setBusy(false);
      if (!res.ok) {
        setError(data.error ?? "Could not confirm that email");
        return;
      }
      switchMode("signin");
      setNotice("Email confirmed. Sign in with your password.");
      return;
    }
    if (mode === "totp" || mode === "totp-setup") {
      if (!/^\d{6}$/.test(totpCode.trim())) {
        setError("Enter the 6-digit code from your authenticator app.");
        return;
      }
      setBusy(true);
      const res = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      setBusy(false);
      if (!res.ok) {
        setError(data.error ?? "That code did not match.");
        return;
      }
      onContinue(parseAccountRole(data.role) || role);
      return;
    }
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
        role,
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
      setEmail(email);
      switchMode("signin");
      setNotice(
        data.confirmRequired
          ? data.emailSent
            ? "Check your inbox (and spam) for a confirmation link. Then sign in."
            : "Account created. If the confirmation email does not arrive, sign in to get a new link."
          : "Account created. Sign in with your password."
      );
      return;
    }
    if (data.totpRequired) {
      switchMode("totp");
      return;
    }
    if (data.totpSuggested) {
      switchMode("totp-setup");
      const setup = await fetch("/api/auth/totp/setup").then((r) =>
        r.json().catch(() => ({}))
      );
      if (setup.secret) {
        applyTotpSetup({
          secret: setup.secret,
          account: setup.account,
          email: setup.email ?? email,
          qrDataUrl: setup.qrDataUrl,
        });
      }
      if (data.role) setRole(parseAccountRole(data.role));
      return;
    }
    onContinue(parseAccountRole(data.role) || role);
  }

  const submitLabel =
    mode === "signin"
      ? "Sign me in"
      : mode === "forgot"
        ? "Send reset link"
        : mode === "reset"
          ? "Save new password"
          : mode === "confirm"
            ? "Confirm my email"
            : mode === "totp"
            ? "Confirm code"
            : mode === "totp-setup"
              ? "Turn it on"
              : "Create my account";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      noValidate
    >
      {mode === "signup" || mode === "signin" ? (
        <div className="mb-5 flex rounded-full bg-[#EEF0EC] p-1">
          {(["signup", "signin"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={cn(
                "flex-1 min-h-11 rounded-full py-2.5 text-sm font-medium",
                mode === m
                  ? "bg-white text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                  : "text-[#8a9086]"
              )}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>
      ) : (
        <p className="mb-5 text-sm text-muted-foreground">
          {mode === "reset"
            ? "Use at least 10 characters, with letters and a number."
            : mode === "confirm"
              ? "This proves the inbox is yours. Mail apps will not use up the link until you tap the button."
            : mode === "totp"
              ? "Codes refresh every 30 seconds."
              : mode === "totp-setup"
                ? "Takes a minute. Keeps someone with your password from walking in. The account should read Kredoof : your email."
                : "We’ll email a reset link if that email or phone has an account."}
        </p>
      )}
      {mode === "signup" ? (
        <div className="mb-5">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            I’m here to
          </p>
          <div className="flex rounded-full bg-[#EEF0EC] p-1">
            {(
              [
                ["borrower", "Get credit"],
                ["lender", "Lend"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={cn(
                  "flex-1 min-h-11 rounded-full py-2.5 text-sm font-medium",
                  role === value
                    ? "bg-white text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                    : "text-[#8a9086]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {mode === "signup" ? (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              First name
            </p>
            <label
              className={cn(
                "flex items-center gap-2.5 rounded-[14px] border bg-white px-3.5 py-3",
                firstNameError ? "border-[#C24545]" : "border-hairline"
              )}
            >
              <User size={16} className="shrink-0 text-[#a9b0a2]" />
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={() => mark("firstName")}
                placeholder="Amina"
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
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Last name
            </p>
            <label
              className={cn(
                "flex items-center gap-2.5 rounded-[14px] border bg-white px-3.5 py-3",
                lastNameError ? "border-[#C24545]" : "border-hairline"
              )}
            >
              <User size={16} className="shrink-0 text-[#a9b0a2]" />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={() => mark("lastName")}
                placeholder="Wanjiku"
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
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Email
          </p>
          <label
            className={cn(
              "flex items-center gap-2.5 rounded-[14px] border bg-white px-3.5 py-3",
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
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Phone
          </p>
          <label
            className={cn(
              "flex items-center gap-2.5 rounded-[14px] border bg-white px-3.5 py-3",
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
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Email or phone
          </p>
          <label
            className={cn(
              "flex items-center gap-2.5 rounded-[14px] border bg-white px-3.5 py-3",
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
              placeholder="you@gmail.com or 0712 345 678"
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
      {mode !== "forgot" &&
      mode !== "confirm" &&
      mode !== "totp" &&
      mode !== "totp-setup" ? (
        <div className={mode === "signin" ? "mb-2" : "mb-5"}>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {mode === "reset" ? "New password" : "Password"}
          </p>
          <label
            className={cn(
              "flex items-center gap-2.5 rounded-[14px] border bg-white px-3.5 py-3",
              passwordError ? "border-[#C24545]" : "border-hairline"
            )}
          >
            <Lock size={16} className="text-[#a9b0a2]" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setServerPasswordError(null);
              }}
              onBlur={() => mark("password")}
              placeholder="At least 10 characters, with a number"
              minLength={mode === "signin" ? 1 : 10}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="shrink-0 text-[#a9b0a2]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </label>
          {passwordError ? (
            <p className="mt-1 text-xs text-[#C24545]">{passwordError}</p>
          ) : null}
        </div>
      ) : null}
      {mode === "reset" ? (
        <div className="mb-5">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Confirm password
          </p>
          <label
            className={cn(
              "flex items-center gap-2.5 rounded-[14px] border bg-white px-3.5 py-3",
              confirmError ? "border-[#C24545]" : "border-hairline"
            )}
          >
            <Lock size={16} className="text-[#a9b0a2]" />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => mark("confirm")}
              placeholder="Type it again"
              minLength={10}
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
      {mode === "totp-setup" && totpSecret ? (
        <div className="mb-5 rounded-[14px] border border-hairline bg-white px-3.5 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTotpAddMode("scan")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                totpAddMode === "scan"
                  ? "bg-mint-deep text-white"
                  : "border border-hairline text-muted-foreground"
              )}
            >
              Scan QR
            </button>
            <button
              type="button"
              onClick={() => setTotpAddMode("key")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                totpAddMode === "key"
                  ? "bg-mint-deep text-white"
                  : "border border-hairline text-muted-foreground"
              )}
            >
              Type the key
            </button>
          </div>
          {totpAddMode === "scan" && totpQr ? (
            <div className="mt-3 flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={totpQr}
                alt="Scan this QR with your authenticator app"
                width={192}
                height={192}
                className="h-48 w-48"
              />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Open Google Authenticator or Authy and scan this code.
              </p>
            </div>
          ) : totpAddMode === "scan" ? (
            <p className="mt-3 text-sm text-muted-foreground">
              QR is not ready. Type the key instead.
            </p>
          ) : (
            <>
              <p className="mt-3 text-xs font-medium text-muted-foreground">
                In your authenticator app, add a key
              </p>
              <p className="mt-1 text-sm">
                Account: {totpAccount || "Kredoof : your email"}
              </p>
              <p className="mt-2 break-all font-mono text-sm tracking-wide">
                {totpSecret}
              </p>
            </>
          )}
        </div>
      ) : null}
      {mode === "totp" || (mode === "totp-setup" && totpSecret) ? (
        <div className="mb-5">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            6-digit code
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            required
            className="w-full rounded-[14px] border border-hairline bg-white px-3.5 py-3 text-center font-mono text-lg tracking-[0.4em] outline-none"
          />
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
      <PrimaryButton type="submit" disabled={busy} className="bg-mint-deep">
        {busy ? "Please wait…" : submitLabel}
      </PrimaryButton>
      {mode === "signin" ? (
        <>
          <p className="mt-4 text-center text-xs text-muted-foreground">or</p>
          <a
            href="/api/auth/google"
            className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-hairline bg-white px-8 py-3.5 text-sm font-medium text-foreground"
          >
            Continue with Google
          </a>
          <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">
            Same Gmail you used to create your account. New here? Sign up first.
          </p>
        </>
      ) : null}
      {mode === "totp-setup" ? (
        <button
          type="button"
          onClick={() => onContinue(role)}
          className="mt-4 block w-full text-center text-sm font-semibold text-mint-deep"
        >
          Not now
        </button>
      ) : null}
      {mode === "forgot" || mode === "reset" || mode === "confirm" || mode === "totp" ? (
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className="mt-4 block w-full text-center text-sm font-semibold text-mint-deep"
        >
          Back to sign in
        </button>
      ) : null}
    </form>
  );
}
