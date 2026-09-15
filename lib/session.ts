import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type KredoofSession = {
  nonce?: string;
  email?: string;
  name?: string;
  wallet?: string;
  signedIn?: boolean;
};

const password =
  process.env.SESSION_SECRET?.padEnd(32, "k") ??
  "kredoof-dev-session-secret-key!!";

const sessionOptions: SessionOptions = {
  password: password.slice(0, 64).padEnd(32, "x"),
  cookieName: "kredoof_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession() {
  const store = await cookies();
  return getIronSession<KredoofSession>(store, sessionOptions);
}

export function apiOrigin(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8471").replace(
    /\/$/,
    ""
  );
}
