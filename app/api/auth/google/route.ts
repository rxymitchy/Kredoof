import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  googleAuthorizeUrl,
  googleConfigured,
  googleRedirectUri,
  googleStateCookieName,
  newGoogleState,
  onboardErrorUrl,
} from "@/lib/google-oauth";

export async function GET(request: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(
      onboardErrorUrl(
        request,
        "Google sign-in is not set up yet. Use your email and password."
      )
    );
  }
  const state = newGoogleState();
  const jar = await cookies();
  jar.set(googleStateCookieName(), state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return NextResponse.redirect(googleAuthorizeUrl(state, googleRedirectUri(request)));
}
