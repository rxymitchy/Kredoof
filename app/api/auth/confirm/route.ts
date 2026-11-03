import { NextResponse } from "next/server";
import { confirmEmailToken } from "@/lib/persist";
import { appOrigin } from "@/lib/session";

/** Mail apps often prefetch GET links. Send people to a button instead of consuming the token. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const origin = appOrigin(request);
  const next = new URL("/onboard", origin);
  next.searchParams.set("step", "confirm");
  if (token) next.searchParams.set("token", token);
  return NextResponse.redirect(next);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { token?: string };
  const token = body.token?.trim() ?? "";
  try {
    await confirmEmailToken(token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not confirm that email";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
