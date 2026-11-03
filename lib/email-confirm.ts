/** Off until a Resend sending domain is verified. Set EMAIL_CONFIRM_REQUIRED=true to turn it back on. */
export function emailConfirmRequired(): boolean {
  const value = process.env.EMAIL_CONFIRM_REQUIRED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}
