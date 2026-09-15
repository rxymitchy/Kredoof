import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/persist";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string; password?: string };
  try {
    const data = await resetPasswordWithToken(
      body.token ?? "",
      body.password ?? ""
    );
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not reset that password",
      },
      { status: 400 }
    );
  }
}
