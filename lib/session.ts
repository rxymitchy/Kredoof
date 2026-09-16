import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type KredoofSession = {
  nonce?: string;
  email?: string;
  phone?: string;
  name?: string;
  wallet?: string;
  signedIn?: boolean;
  lastSeenAt?: number;
};

const password =
  process.env.SESSION_SECRET?.padEnd(32, "k") ??
  "kredoof-dev-session-secret-key!!";

/** Signed-in cookie lasts 1 hour, refreshed on each authenticated request. */
export const SESSION_TTL_SECONDS = 60 * 60;

const sessionOptions: SessionOptions = {
  password: password.slice(0, 64).padEnd(32, "x"),
  cookieName: "kredoof_session",
  ttl: SESSION_TTL_SECONDS,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  const store = await cookies();
  return getIronSession<KredoofSession>(store, sessionOptions);
}

export async function establishSession(input: {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  wallet?: string | null;
}) {
  const session = await getSession();
  if (input.email) session.email = input.email;
  if (input.phone) session.phone = input.phone;
  if (input.name) session.name = input.name;
  if (input.wallet) session.wallet = input.wallet;
  session.signedIn = true;
  session.lastSeenAt = Date.now();
  await session.save();
  return session;
}

export async function readActiveSession() {
  const empty = {
    signedIn: false as const,
    email: null,
    phone: null,
    name: null,
    wallet: null,
  };
  const session = await getSession();
  if (!session.signedIn) return empty;
  const lastSeen = session.lastSeenAt ?? Date.now();
  if (Date.now() - lastSeen > SESSION_TTL_SECONDS * 1000) {
    session.destroy();
    return empty;
  }
  session.lastSeenAt = Date.now();
  await session.save();
  return {
    signedIn: true as const,
    email: session.email ?? null,
    phone: session.phone ?? null,
    name: session.name ?? null,
    wallet: session.wallet ?? null,
  };
}

export function apiOrigin(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8471").replace(
    /\/$/,
    ""
  );
}

export function appOrigin(request?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (request) return new URL(request.url).origin;
  return "http://localhost:3000";
}
