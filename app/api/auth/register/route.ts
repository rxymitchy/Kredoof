import { NextResponse } from "next/server";
import { registerUser } from "@/lib/persist";
import { apiOrigin } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  };
  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const email = body.email ?? "";
  const password = body.password ?? "";
  try {
    const data = await registerUser({ email, password, firstName, lastName });
    await fetch(`${apiOrigin()}/api/accounts/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        password,
        name: data.name,
        first_name: data.firstName,
        last_name: data.lastName,
      }),
    }).catch(() => null);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create account" },
      { status: 400 }
    );
  }
}
