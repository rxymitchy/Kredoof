import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { loansForAccount, updateLoan } from "@/lib/persist";
import { isOpenLoanStatus } from "@/lib/loan-terms";

export async function POST(request: Request) {
  const session = await getSession();
  const body = (await request.json()) as {
    loanId?: string;
    txHash?: string;
  };
  const loans = await loansForAccount({
    email: session.email,
    wallet: session.wallet,
  });
  const open = body.loanId
    ? loans.find((loan) => loan.id === body.loanId)
    : loans.find((loan) => isOpenLoanStatus(loan.status));
  if (!open) {
    return NextResponse.json({ error: "No open loan to mark paid." }, { status: 404 });
  }
  const updated = await updateLoan(open.id, {
    status: "repaid",
    repay_tx: body.txHash ?? open.repay_tx,
  });
  return NextResponse.json({ loan: updated });
}
