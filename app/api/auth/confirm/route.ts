import { NextResponse } from "next/server";
import { confirmEmailToken } from "@/lib/persist";
import { appOrigin, establishSession } from "@/lib/session";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const origin = appOrigin(request);
  try {
    const user = await confirmEmailToken(token);
    await establishSession({
      email: user.email,
      phone: user.phone,
      name: user.name,
    });
    return NextResponse.redirect(`${origin}/onboard?step=connect`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not confirm that email";
    return NextResponse.redirect(
      `${origin}/onboard?step=signin&error=${encodeURIComponent(message)}`
    );
  }
}
