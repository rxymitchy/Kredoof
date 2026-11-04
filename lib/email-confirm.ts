/** Production requires a confirmed inbox. Set EMAIL_CONFIRM_REQUIRED=false for local without Resend. */
export function emailConfirmRequired(): boolean {
  const value = process.env.EMAIL_CONFIRM_REQUIRED?.trim().toLowerCase();
  if (value === "0" || value === "false" || value === "no") return false;
  if (value === "1" || value === "true" || value === "yes") return true;
  return process.env.NODE_ENV === "production";
}
