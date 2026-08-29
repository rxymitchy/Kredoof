import type { Applicant, CreditDecision, OnChainTransaction } from "@/types";
import type { LoanBand } from "@/types";
import {
  formatDateLong,
  formatKesOfUsdc,
  formatUsdc,
  shortenAddress,
  usdcFromKes,
} from "@/lib/format";
import { LOAN_BANDS } from "@/lib/loan-bands";

export function reportIdFor(applicant: Applicant, score: number): string {
  const raw = `${applicant.name}${score}${applicant.walletAddress}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  return "KRD-" + h.toString(16).toUpperCase().padStart(8, "0");
}

export function generateReportHtml(args: {
  applicant: Applicant;
  decision: CreditDecision;
  band: LoanBand;
  txs: OnChainTransaction[];
  reportId: string;
  totalInUsdc: number;
  totalOutUsdc: number;
}): string {
  const { applicant, decision, band, txs, reportId, totalInUsdc, totalOutUsdc } =
    args;
  const dateStr = formatDateLong();
  const ceilingUsdc = usdcFromKes(band.ceilingKes);
  const rows = txs
    .slice(0, 14)
    .map((t) => {
      const label = `${t.asset} transfer`;
      const signed = `${t.direction === "in" ? "+" : "−"}${formatUsdc(t.amount)}`;
      const color = t.direction === "in" ? "#2F8F52" : "#C24545";
      return `<tr><td>${formatDateLong(t.timestamp)}</td><td>${label}</td><td class="mono">${shortenAddress(t.from)} → ${shortenAddress(t.to)}</td><td style="color:${color}">${signed}</td><td class="mono">${t.hash}</td><td>Verified</td></tr>`;
    })
    .join("");
  const factorRows = decision.methodology
    .map(
      (f) =>
        `<tr><td>${f.label}</td><td>${f.weightPercent}%</td><td>${f.scoreOutOf100}/100</td></tr>`
    )
    .join("");
  const bandRows = LOAN_BANDS.map((b) => {
    const usdc = usdcFromKes(b.ceilingKes);
    const highlight = b.tier === band.tier ? "background:#F6EFD4;font-weight:bold;" : "";
    const ceiling =
      b.ceilingKes > 0
        ? `${formatUsdc(usdc)}<br/><span class="mono" style="font-size:9.5px;color:#7C8570;">${formatKesOfUsdc(usdc)}</span>`
        : "—";
    return `<tr style="${highlight}"><td>${b.min}–${b.max}</td><td>${b.tier}</td><td>${ceiling}</td><td>${b.rate}</td></tr>`;
  }).join("");

  return `<!doctype html><html><head><meta charset="utf-8"/><title>Kredoof Credit Report — ${applicant.name}</title>
  <style>
    body{font-family:Georgia,'Times New Roman',serif;background:#EFF3EE;margin:0;padding:32px;color:#0F2340;}
    .mono{font-family:'Courier New',monospace;font-size:11px;}
    .sheet{max-width:760px;margin:0 auto;background:#fff;border:1px solid #dcdfe6;}
    .head{background:#0F2340;color:#fff;padding:22px 34px;display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #C9A227;}
    .head h1{font-size:17px;margin:0;letter-spacing:.5px;}
    .head .ref{font-family:'Courier New',monospace;font-size:11px;color:#C9A227;margin-top:4px;}
    .body{padding:28px 34px;}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-size:12.5px;margin-bottom:18px;}
    .grid div span{color:#7C8570;display:block;font-size:10px;text-transform:uppercase;letter-spacing:.5px;font-family:Arial,sans-serif;}
    .sec{font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;color:#0F2340;text-transform:uppercase;border-bottom:2px solid #C9A227;padding-bottom:4px;margin:26px 0 10px;}
    table{width:100%;border-collapse:collapse;font-size:11.5px;}
    th{text-align:left;font-family:Arial,sans-serif;font-size:9.5px;color:#7C8570;text-transform:uppercase;padding:6px 4px;border-bottom:1px solid #ddd;}
    td{padding:6px 4px;border-bottom:1px solid #f0f0f0;}
    .scorebox{background:#0F2340;color:#fff;border-radius:8px;padding:22px;display:flex;align-items:center;justify-content:space-between;margin:16px 0;}
    .scorebox .num{font-size:44px;font-weight:bold;}
    .stamp{border:2px solid #C9A227;color:#C9A227;display:inline-block;padding:6px 12px;border-radius:6px;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1px;}
    .foot{margin-top:24px;font-size:10px;color:#7C8570;font-family:Arial,sans-serif;line-height:1.7;border-top:1px solid #eee;padding-top:12px;}
  </style></head><body>
  <div class="sheet">
    <div class="head"><div><h1>KREDOOF CREDIT REPORT</h1><div class="ref">Report ID ${reportId} &middot; Issued ${dateStr}</div></div><div class="stamp">${band.tier.toUpperCase()}</div></div>
    <div class="body">
      <div class="grid">
        <div><span>Applicant / MSME</span>${applicant.name}</div>
        <div><span>Wallet address</span><span class="mono" style="display:inline">${applicant.walletAddress}</span></div>
        <div><span>Sector</span>${applicant.sector}</div>
        <div><span>Location</span>${applicant.location}</div>
        <div><span>Network</span>Avalanche</div>
        <div><span>Data source</span>Mock Avalanche ledger (replaceable with live indexer)</div>
        <div><span>Verification</span>Blockchain-verified transfers (USDC / USDT)</div>
        <div><span>Report date</span>${dateStr}</div>
      </div>
      <div class="sec">Executive Summary</div>
      <p style="font-size:12.5px;line-height:1.7;">${applicant.name} has a verified on-chain history analyzed by Kredoof. Composite score <strong>${decision.score}</strong> — <strong>${band.tier}</strong> tier${band.ceilingKes > 0 ? `, indicative limit ${formatUsdc(ceilingUsdc)} (${formatKesOfUsdc(ceilingUsdc)}) at ${band.rate}` : ""}.</p>
      <div class="sec">Key Metrics</div>
      <div class="grid">
        <div><span>On-chain score</span>${decision.score} / 850</div>
        <div><span>Risk</span>${decision.riskLabel}</div>
        <div><span>Turnover (sample window)</span>${formatUsdc(totalInUsdc)} (${formatKesOfUsdc(totalInUsdc)})</div>
        <div><span>On-time repayment rate</span>100%</div>
      </div>
      <div class="sec">Verified Transaction History (sample)</div>
      <table><tr><th>Date</th><th>Transaction</th><th>From / To</th><th>Amount</th><th>Tx hash</th><th>Status</th></tr>${rows}</table>
      <p style="font-size:11px;color:#7C8570;margin-top:8px;">Sample window — Inflow: ${formatUsdc(totalInUsdc)} · Outflow: ${formatUsdc(totalOutUsdc)} · Net: ${formatUsdc(totalInUsdc - totalOutUsdc)}</p>
      <div class="sec">Score Methodology</div>
      <table><tr><th>Factor</th><th>Weight</th><th>Score</th></tr>${factorRows}</table>
      <div class="scorebox"><div><div style="font-size:11px;color:#C9A227;text-transform:uppercase;letter-spacing:1px;">Composite Score</div><div class="num">${decision.score}</div></div><div style="text-align:right;"><div style="font-size:13px;">${band.tier} tier</div><div style="font-size:11px;color:#cbd5e1;">${band.ceilingKes > 0 ? formatUsdc(ceilingUsdc) + " (" + formatKesOfUsdc(ceilingUsdc) + ") · " + band.rate : "No indicative offer"}</div></div></div>
      <div class="sec">Loan Eligibility Bands</div>
      <table><tr><th>Score range</th><th>Tier</th><th>Indicative ceiling</th><th>Indicative rate</th></tr>${bandRows}</table>
      <div class="foot">This decision is based on verified on-chain transaction activity analyzed by Kredoof. Kredoof provides credit decision support. Final KYC, lending approval and disbursement remain the responsibility of the lender. Report ID ${reportId}.</div>
    </div>
  </div>
  </body></html>`;
}
