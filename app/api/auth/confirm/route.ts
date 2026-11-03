import { NextResponse } from "next/server";
import { confirmEmailToken } from "@/lib/persist";
import { appOrigin } from "@/lib/session";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const origin = appOrigin(request);
  try {
    await confirmEmailToken(token);
    return NextResponse.redirect(`${origin}/onboard?step=signin&confirmed=1`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not confirm that email";
    return NextResponse.redirect(
      `${origin}/onboard?step=signin&error=${encodeURIComponent(message)}`
    );
  }
}
