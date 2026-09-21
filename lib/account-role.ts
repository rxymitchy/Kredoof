export type AccountRole = "borrower" | "lender";

export function parseAccountRole(value: unknown): AccountRole {
  return value === "lender" ? "lender" : "borrower";
}
