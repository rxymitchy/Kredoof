# Kredoof

**Got the proof? Get the credit.**

Kredoof looks at money that already moved in a wallet and turns it into a simple yes, no, or how much. A business signs up, connects a wallet, and gets a plain-language result. A lender can pick a business that already qualified and fund it.

It is not a bank, a licensed lender, a trading app, or a wallet. The person who funds the loan earns the interest. Kredoof is paid when a file is taken and when money is actually sent.

- App: https://kredoof.vercel.app
- Scoring API: https://backend-sigma-silk-84.vercel.app

Scoring today uses USDC and USDT on one chain (Avalanche). More chains later, after the file works.

---

## What you can do

- **Get credit** — Sign up with name, email, Kenyan phone, and password. Connect a wallet or open the sample result. See payments, the score, and a downloadable summary.
- **Become a lender** — Sign up as a lender. Open the desk, pick a qualified file, lock it, then fund.
- **Sign in** — Email, phone, or Continue with Google if that Gmail already has a Kredoof account. New people sign up first.

If the wallet has no stablecoin payments on this chain yet, use the sample result.

---

## Tech

| Layer | What we use |
| --- | --- |
| Website | Next.js, React, TypeScript, Tailwind CSS |
| Hosting | Vercel |
| Accounts | Neon Postgres in production. Local can run without a database. |
| Email | Resend (optional) |
| Wallets | RainbowKit |
| Scoring | Python app in `backend/` |

Node.js 20+ and npm for the website. Python 3.12+ only if you run scoring on your machine.

---

## Run the website locally

1. Clone and install:

   ```bash
   git clone https://github.com/rxymitchy/Kredoof.git
   cd Kredoof
   npm install
   ```

2. Copy the example env file. Leave most values empty at first.

   ```bash
   cp .env.example .env.local
   ```

   Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Start:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

Do not commit `.env.local` or any private keys.

```bash
npm run build
npm run start
```

---

## Optional: scoring on your machine

The live site already uses the hosted API. See `backend/README.md` if you want to run it locally.

In `.env.local` set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8471`, then restart `npm run dev`.

---

## What to put in `.env.local`

See `.env.example`. For a simple local run you can leave almost everything blank.

| You want to… | Fill in |
| --- | --- |
| Run on your laptop | Nothing extra, or point `NEXT_PUBLIC_API_URL` at the hosted API |
| Keep login sessions stable | `SESSION_SECRET` |
| Send confirmation / reset email | Resend key, from-address, and `NEXT_PUBLIC_APP_URL` |
| Store accounts in a database | `DATABASE_URL` from Neon |
| WalletConnect QR | WalletConnect / Reown project ID |
| Continue with Google | `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (keep empty in git) |

Sending money from the demo treasury needs the public address and private key in env. Never put the private key in git, chat, or screenshots.

---

## License

Hackathon prototype. Confirm licensing with the repo owner before shipping commercially.
