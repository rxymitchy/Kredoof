import { randomBytes } from "crypto";
import { appOrigin } from "@/lib/session";

const STATE_COOKIE = "kredoof_google_state";

export function googleClientId(): string {
  return (
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    ""
  );
}

export function googleConfigured(): boolean {
  return Boolean(googleClientId() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function googleRedirectUri(request: Request): string {
  return `${appOrigin(request)}/api/auth/google/callback`;
}

export function googleStateCookieName(): string {
  return STATE_COOKIE;
}

export function newGoogleState(): string {
  return randomBytes(16).toString("hex");
}

export function googleAuthorizeUrl(state: string, redirectUri: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", googleClientId());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function googleProfileFromCode(
  code: string,
  redirectUri: string
): Promise<{ googleId: string; email: string }> {
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!googleClientId() || !secret) {
    throw new Error("Google sign-in is not set up");
  }
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId(),
      client_secret: secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenBody = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };
  if (!tokenRes.ok || !tokenBody.access_token) {
    throw new Error("Google sign-in failed. Try again.");
  }
  const meRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenBody.access_token}` },
  });
  const me = (await meRes.json()) as { id?: string; email?: string };
  if (!meRes.ok || !me.id || !me.email) {
    throw new Error("Google did not share an email we can use.");
  }
  return { googleId: me.id, email: me.email };
}

export function onboardErrorUrl(request: Request, message: string): string {
  const url = new URL("/onboard", appOrigin(request));
  url.searchParams.set("step", "signin");
  url.searchParams.set("error", message);
  return url.toString();
}
