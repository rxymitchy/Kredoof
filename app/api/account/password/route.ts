import { NextResponse } from "next/server";
import { changeAccountPassword } from "@/lib/persist";
import { readActiveSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await readActiveSession();
  if (!session.signedIn || !session.email) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  const body = (await request.json()) as {
    currentPassword?: string;
    nextPassword?: string;
  };
  try {
    await changeAccountPassword(
      session.email,
      String(body.currentPassword ?? ""),
      String(body.nextPassword ?? "")
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not change password" },
      { status: 400 }
    );
  }
}
