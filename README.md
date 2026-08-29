# Kredoof

**Got the proof? Get the credit.**

Kredoof is an agentic **credit underwriting** frontend for the on-chain economy. A business connects a wallet, Kredoof reads verified blockchain transfers, and the product produces an explainable credit decision a lender can use.

It is **not** a trading app, a wallet, or a score widget with no evidence. The transaction itself is the evidence.

This repository is a **hackathon demo**: polished UI, Avalanche wallet connection, and a **mock** ledger/underwriting layer you can swap for live data later.

Live repo: [github.com/rxymitchy/Kredoof](https://github.com/rxymitchy/Kredoof)

---

## What this demo shows

1. Connect an Avalanche-ready wallet (or preview a sample ledger).
2. Kredoof “reads” on-chain activity (mock Avalanche USDC/USDT transfers today).
3. Sequential analysis, then a credit profile (score **742 / 850**, **Established**, **KES 750,000**).
4. A lender-facing report you can download as HTML or print.

Demo applicant (keep these numbers consistent if you change mock data):

| Field | Value |
| --- | --- |
| Business | Jua Kali Leather Works |
| Sector / location | Leather Goods · Nairobi, Kenya |
| Network | Avalanche |
| Score / risk / limit | 742 / 850 · Medium-Low · KES 750,000 |
| Activity | 2,430 txs · 19-month wallet age · 100% on-time repayment |

Transactions in the UI are labeled as **USDC transfer** / **USDT transfer** (hash, from, to, amount, verified). Do not invent off-chain labels like “inventory purchase” unless the chain data actually proves that.

---

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 · shadcn/ui · Lucide · Framer Motion
- wagmi · viem · RainbowKit (Avalanche)
- Recharts is installed for later activity charts

Node.js 20+ and npm are enough.

---

## Setup

```bash
git clone https://github.com/rxymitchy/Kredoof.git
cd Kredoof
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint
```

If `npm install` fails with an SSL / certificate error (common on some Windows networks):

```powershell
$env:npm_config_strict_ssl="false"
npm install
```

Do not commit that setting into git config.

---

## Environment

Copy `.env.example` to `.env.local`.

| Variable | Required? | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional | 32-character Reown / WalletConnect Cloud project ID. Enables WalletConnect / mobile QR. |

Without it, **MetaMask, Coinbase Wallet, and Rabby** still work via injected connectors. WalletConnect is **not** registered until the ID is a real 32-char hex string (not all zeros).

To enable WalletConnect:

1. Create a project at [cloud.reown.com](https://cloud.reown.com).
2. Allow origin `http://localhost:3000` (and your production URL).
3. Put the project ID in `.env.local` and restart `npm run dev`.

Never commit `.env.local`. `.env*` is gitignored except `.env.example`.

---

## Using the demo

1. **Landing** — Connect Wallet, See How It Works, or demo email (any values continue).
2. **Connect** — Pick a wallet, or **Preview with sample Avalanche ledger** if you do not have an extension.
3. **Analyze** — Animated steps (wallet → txs → verify → activity → risk → decision). This is UX, not a live engine.
4. **Overview** — Score stays `— · —` until you run the agent. Then **742**.
5. **Agent** — Mock underwriting. Risk copy is labeled as mock; it is not live fraud detection.
6. **Report** — Lender view + Download (HTML) / Print.

On desktop: full-width site, header, sidebar. On mobile: same flow, bottom tabs.

---

## Project layout

```
app/                 # Routes. `/` is the product. `/dashboard/*` opens the same app at the main stage.
components/
  mobile/            # Product flow (landing → connect → analysis → dashboard)
  providers/         # wagmi + RainbowKit + React Query
  ui/                # shadcn primitives
  layout/, kredoof/  # Earlier shell pieces; product UI is primarily `mobile/`
data/                # Mock applicant, txs, financials, credit decision
services/
  blockchain.ts      # Wallet + tx access (mock; swap for RPC/indexer)
  underwriting.ts     # Credit/risk/report (mock; swap for underwriting API)
hooks/               # Client loaders over those services
types/               # Wallet, transaction, profile, risk, decision
lib/
  wagmi.ts           # Avalanche config
  loan-bands.ts      # Score → tier / indicative KES ceiling
  report-html.ts     # Frontend-generated HTML report
```

**Rule:** do not hard-code ledger rows in screens. Read from `blockchainService` / `underwritingService` (or the hooks). Replace mock implementations in `services/` when the backend exists.

---

## How to continue (next work)

### Replace mock ledger with real Avalanche data

1. Keep the transaction type in `types/transaction.ts` (`hash`, `from`, `to`, `asset`, `amount`, `direction`, `verificationStatus`).
2. Implement `services/blockchain.ts` against Snowtrace / an indexer / your RPC.
3. Map results into `OnChainTransaction`. Short hashes in the table; full hash in the detail sheet.
4. “View on Avalanche Explorer” already points at Snowtrace; it only makes sense once hashes are real.

### Replace mock underwriting

1. Keep `services/underwriting.ts` as the only scoring/risk entry point.
2. Return the same shapes (`CreditDecision`, `RiskAnalysis`, `FinancialProfile`).
3. Keep the mock **disclaimer** until real checks exist. Do not imply live fraud detection.

### Wallet / chain

- Target chain is **Avalanche C-Chain** (`43114`) in `lib/wagmi.ts`.
- Connected address is shown in the header. The **sample ledger** is still Jua Kali’s mock wallet until you bind txs to `useAccount().address`.

### Charts

Recharts is in `package.json`. Monthly volume and inflows vs outflows live on `mockFinancialProfile` in `data/mock-financials.ts`.

---

## Product notes for contributors

- **Evidence:** on-chain transfers, not M-Pesa or uploaded bank statements.
- **Continuous underwriting:** “Prime · KES 2,000,000” is **vision**, not a forecast from this demo.
- **Pricing (pitch only):** KES 50–150 per assessment + 1% on disbursed loans. Final KYC and lending stay with the lender.
- **Differentiation:** start from verified blockchain activity; do not trash competitors.

---

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| WalletConnect 403 / origin not allowlisted | Add `localhost:3000` in Reown Cloud, or omit the project ID and use injected wallets. |
| Hydration warnings with `data-cursor-ref` | Cursor’s in-IDE browser injects attributes. Check in Chrome/Firefox. |
| `git push` auth failed | GitHub does not accept account passwords. Use a [personal access token](https://github.com/settings/tokens) or SSH (`git remote set-url origin git@github.com:rxymitchy/Kredoof.git`). |
| Git SSL certificate errors | Session only: `$env:GIT_SSL_NO_VERIFY="1"` then push. Prefer fixing the corporate CA long-term. |

---

## License

Hackathon prototype. Confirm licensing with the repo owner before shipping commercially.
