import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { LoginError, loginWithGoogle } from "@/lib/persist";
import { parseAccountRole } from "@/lib/account-role";
import {
  googleProfileFromCode,
  googleRedirectUri,
  googleStateCookieName,
  onboardErrorUrl,
} from "@/lib/google-oauth";
import { appOrigin, beginTotpChallenge, establishSession } from "@/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const jar = await cookies();
  const expected = jar.get(googleStateCookieName())?.value ?? "";
  jar.delete(googleStateCookieName());
  if (url.searchParams.get("error")) {
    return NextResponse.redirect(
      onboardErrorUrl(request, "Google sign-in was cancelled.")
    );
  }
  const stateOk =
    Boolean(code && state && expected) &&
    state.length === expected.length &&
    timingSafeEqual(Buffer.from(state), Buffer.from(expected));
  if (!stateOk) {
    return NextResponse.redirect(
      onboardErrorUrl(request, "Google sign-in expired. Try again.")
    );
  }
  try {
    const profile = await googleProfileFromCode(code, googleRedirectUri(request));
    const data = await loginWithGoogle(profile);
    const origin = appOrigin(request);
    if (data.totpEnabled) {
      await beginTotpChallenge(data.email);
      return NextResponse.redirect(`${origin}/onboard?step=totp`);
    }
    await establishSession({
      email: data.email,
      phone: data.phone,
      name: data.name,
      wallet: data.wallet,
      role: parseAccountRole(data.role),
    });
    const next =
      parseAccountRole(data.role) === "lender"
        ? `${origin}/lend`
        : `${origin}/onboard?step=connect`;
    return NextResponse.redirect(next);
  } catch (error) {
    const message =
      error instanceof LoginError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Google sign-in failed. Try again.";
    return NextResponse.redirect(onboardErrorUrl(request, message));
  }
}
