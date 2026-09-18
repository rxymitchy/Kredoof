# Kredoof

**Got the proof? Get the credit.**

Kredoof turns verified Avalanche wallet payments (USDC / USDT) into a credit summary a lender can read. A business signs up, connects a wallet, and reviews a plain-language report. It is not a licensed lender, a trading app, or a wallet.

- App: https://kredoof.vercel.app
- Scoring API: https://backend-sigma-silk-84.vercel.app

---

## Tech stack

| Layer | What we use |
| --- | --- |
| Website | Next.js, React, TypeScript, Tailwind CSS |
| Hosting | Vercel |
| Accounts | Neon Postgres (production). Local runs can work without a database. |
| Email | Resend (optional; needed for confirmation and password reset) |
| Wallets | RainbowKit on Avalanche |
| Scoring | Python FastAPI app in `backend/` |

Node.js 20+ and npm for the website. Python 3.12+ only if you run the scoring API on your machine.

---

## Run the website locally

1. Clone the repo and install:

   ```bash
   git clone https://github.com/rxymitchy/Kredoof.git
   cd Kredoof
   npm install
   ```

2. Copy the example env file. Leave most values empty at first.

   ```bash
   cp .env.example .env.local
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Start the site:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

Sign up, sign in, and the sample (no wallet) path work with this. Do not commit `.env.local` or any private keys.

For a production-like local run:

```bash
npm run build
npm run start
```

---

## Optional: scoring API on your machine

The live site already uses the hosted API. You only need this if you want scoring against a local Python process.

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn kredoof.api:app --host 127.0.0.1 --port 8471
```

In `.env.local` set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8471`, then restart `npm run dev`.

---

## What to put in `.env.local`

Everything is listed in `.env.example`. A simple local setup can leave almost all of it blank.

| You want to… | Fill in |
| --- | --- |
| Run the site on your laptop | Nothing extra, or point `NEXT_PUBLIC_API_URL` at the hosted API if you prefer |
| Keep login sessions stable | `SESSION_SECRET` (any long random string) |
| Send confirmation / reset email | Resend key and from-address (`RESEND_API_KEY`, `EMAIL_FROM`) plus `NEXT_PUBLIC_APP_URL` |
| Store accounts in a real database | `DATABASE_URL` from Neon (used in production) |
| Use WalletConnect QR pairing | WalletConnect / Reown project ID |

Treasury draw on a live wallet needs the matching public address and private key in env. The private key must never go in git, chat, or screenshots.

---

## Using the product

1. **Home** — sign up, sign in, or read How It Works.
2. **Onboard** — create an account (name, email, Kenyan phone, password). Sign in with email or phone.
3. **Wallet** — connect the wallet you use, or open the sample result.
4. **Dashboard** — review payments, the score, and a downloadable summary. Draw and repay only work when the treasury is funded on Avalanche.

Scoring needs real USDC or USDT transfers on Avalanche C-Chain for that wallet. If none are found, use the sample result instead.

---

## License

Hackathon prototype. Confirm licensing with the repo owner before shipping commercially.
