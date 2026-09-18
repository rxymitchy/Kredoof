# Kredoof

**Got the proof? Get the credit.**

Kredoof turns verified Avalanche wallet payments into a credit summary a lender can read. A business signs up, connects a wallet, and Kredoof looks at real USDC/USDT transfers. It is **not** a licensed lender, a trading app, or a wallet.

Live app: https://kredoof.vercel.app  
API: https://backend-sigma-silk-84.vercel.app

---

## What works today

1. **Sign up** with first name, last name, email, unique Kenyan phone, and password (8+ characters). Duplicate email or phone is rejected.
2. **Confirm email** (Resend) then **sign in** with email or phone. Forgot-password sends a reset link. Session lasts **1 hour** and refreshes while you use the app. Sign out clears it.
3. **Connect a wallet** (MetaMask or Coinbase; WalletConnect if a project ID is set). Approve a simple “this is your wallet” check. You can also open a **sample result** without a wallet.
4. **Review payments** from Avalanche C-Chain USDC/USDT (Avalanche Glacier indexer). Those rows are scored by the Kredoof API.
5. **Documents** — a plain-language summary you can download or print. If the score qualifies, you can **draw** USDC from the treasury and **pay it back** on-chain.

Accounts are stored in **Vercel Blob** (`kredoof-v2`) so they survive serverless restarts. Email and phone each have a unique index. The Python API also keeps a best-effort SQLite copy (ephemeral on Vercel `/tmp`).

If Glacier finds no stablecoin payments, scoring cannot run. The sample path still uses the Jua Kali mock profile (score **742 / 850**, Established, about KES 750,000).

Kredoof does not issue loans itself. Treasury draw only works when `TREASURY_PRIVATE_KEY` is set and that wallet holds Avalanche USDC (plus a little AVAX for gas).

---

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 · shadcn/ui · Lucide
- wagmi · viem · RainbowKit (Avalanche C-Chain `43114`)
- iron-session cookies · Neon Postgres · Vercel Blob (one-time import) · Resend
- FastAPI scoring API (`backend/`) on Vercel

Node.js **20+** and **npm**. Python **3.12+** for the API.

```bash
npm install
```

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

```bash
npm run build
npm run start
npm run lint
```

If `npm install` fails with an SSL error on Windows (session only, do not put this in git config):

```powershell
$env:npm_config_strict_ssl="false"
npm install
```

Local API:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn kredoof.api:app --host 127.0.0.1 --port 8471
```

Keep `NEXT_PUBLIC_API_URL=http://127.0.0.1:8471` in `.env.local` and restart `npm run dev`. Production already points at the hosted API.

---

## Environment

Copy `.env.example` to `.env.local`. Never commit `.env.local` or private keys.

| Variable | Required? | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Recommended | Scoring API origin, no trailing slash. Local default `http://127.0.0.1:8471`. |
| `SESSION_SECRET` | Production | Cookie signing (32+ characters). |
| `BLOB_READ_WRITE_TOKEN` | Until Postgres is live | Old JSON accounts. Used once to copy users into Postgres. |
| `DATABASE_URL` | Production | Neon Postgres. Accounts, loans, and leads. Without it, the app still uses Vercel Blob JSON. |
| `NEXT_PUBLIC_APP_URL` | Emails | Public site origin used in confirm/reset links. Production: `https://kredoof.vercel.app`. |
| `RESEND_API_KEY` | Emails | Sends confirmation and forgot-password mail. Until a domain is verified, Resend’s onboarding from-address often only delivers to the Resend account mailbox. |
| `EMAIL_FROM` | Emails | Example: `Kredoof <onboarding@resend.dev>`. |
| `NEXT_PUBLIC_TREASURY_ADDRESS` | Draw/repay | Public treasury address (safe to share). |
| `TREASURY_PRIVATE_KEY` | Draw | Hex key for that treasury. **Never commit.** |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional | 32-character Reown Cloud ID. MetaMask and Coinbase work without it. |

---

## Using the product

1. **Landing (`/`)** — marketing intro. Sign up, Sign in, or See How It Works. If you already have a session, Continue.
2. **Sign up / Sign in (`/onboard`)** — real accounts. Unregistered emails cannot sign in. Confirm the email when Resend is configured.
3. **Connect wallet** — pick the wallet app you use. Switch network if asked. Or use the sample result.
4. **Overview / Review / Documents** — payments, score, loan snapshot, downloadable summary. Copy is meant for people, not engineers (no hashes or explorer jargon in the main UI).

On desktop: wide layout plus sidebar. On mobile: the same flow with bottom tabs.

---

## Project layout

```
app/                      # `/` landing. `/onboard` signup → wallet. `/dashboard/*` main app.
app/api/auth/             # register, login, confirm, forgot, reset, session, wallet verify
app/api/underwrite/       # Glacier transfers → Python score
app/api/chain/transfers/  # live USDC/USDT reads
app/api/loans/disburse/   # treasury USDC draw
components/mobile/        # product screens
lib/persist.ts            # Blob + local JSON accounts (unique email/phone)
lib/avalanche.ts          # Glacier indexer
lib/session.ts            # 1-hour iron-session
lib/mail.ts               # Resend
lib/report-html.ts        # downloadable summary
backend/kredoof/          # FastAPI scorecard + profile JSON
data/                     # mock sample profile (not live users)
```

Do not commit `data/kredoof-accounts/` or `data/kredoof-verify/`.

---

## How to continue

- **Fund the treasury** with Avalanche USDC (and AVAX for gas) so draw works on the live site.
- **Verify a Resend domain** so confirmation mail can reach any inbox, not only the Resend account.
- **WalletConnect** — add a real project ID and allow `https://kredoof.vercel.app`.
- **Indexer** — Glacier is live for USDC/USDT. Other tokens or chains would need a new reader, same `OnChainTransaction` shape.
- **Lending** — Kredoof is decision support. KYC, approval, and legal lending stay with a licensed partner.

---

## Product notes

- Payments we can see on the wallet are the proof. We do not ask for M-Pesa or paper bank statements.
- “Prime · KES 2,000,000” is a **vision** milestone, not a promise from this demo.
- Pitch pricing: borrower check is free. A lender pays KES 100 for a qualified exclusive file. If they fund, Kredoof also takes 1% of the loan amount. Daily interest goes to the funder.

---

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| Sign up says the email exists, sign in says no account | Blob must be readable with the SDK (`BLOB_READ_WRITE_TOKEN`). Old `kredoof-v1` files are ignored. |
| Confirmation or reset mail never arrives | Check `RESEND_API_KEY` and that you are mailing a mailbox Resend will deliver to. |
| No payments / cannot score | Wallet needs USDC or USDT transfers on Avalanche C-Chain. Sample result still works. |
| Draw fails | Treasury needs USDC + AVAX; `TREASURY_PRIVATE_KEY` must match `NEXT_PUBLIC_TREASURY_ADDRESS`. |
| WalletConnect 403 | Allow the site origin in Reown Cloud, or omit the project ID and use MetaMask/Coinbase. |
| Git SSL errors (Windows) | Session only: `$env:GIT_SSL_NO_VERIFY="1"`. Do not persist that in git config. |

---

## License

Hackathon prototype. Confirm licensing with the repo owner before shipping commercially.
