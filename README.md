# Kredoof

**Got the proof? Get the credit.**

Kredoof turns on-chain payment history into a credit file. A business signs up, connects an Avalanche wallet, and gets a plain-language result. A lender can review a qualified file and fund it. The person who funds the loan earns the interest. Kredoof is paid when a file is taken and when money is actually sent.

**Live product:** [https://kredoof.com](https://kredoof.com)

Kredoof is not a bank, a licensed lender, a trading app, or a wallet.

## Product

**Borrowers** create an account, connect MetaMask, Core, or Trust on Avalanche, and see USDT and USDC that actually moved on that address. If the file qualifies, a lender can fund them. Repayment is in USDT.

**Lenders** create an account, add float with M-Pesa or Avalanche USDT, take a qualified file, and fund. Repayment returns as USDT when the borrower pays.

Sign-in uses email or phone. Google is available for a Gmail that already has a Kredoof account. Email confirmation happens after sign-in, from Home.

## Stack

| Area | Choice |
| --- | --- |
| Web app | Next.js, React, TypeScript, Tailwind CSS |
| Hosting | Vercel |
| Accounts and loans | Postgres in production |
| Scoring | Python service in `backend/` |
| Chain | Avalanche C-Chain (USDT / USDC) |

## Local development

Requires Node.js 20+ and npm.

```bash
git clone https://github.com/rxymitchy/Kredoof.git
cd Kredoof
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, copy the env file with `Copy-Item .env.example .env.local`.

Open [http://localhost:3000](http://localhost:3000). A local run works with an empty `.env.local`. Production configuration belongs in the host environment, not in git.

```bash
npm run build
npm start
```

Scoring on your machine is optional. See `backend/README.md`.

## Repository layout

```
app/           Next.js routes and APIs
components/    Product UI
lib/           Domain logic and server helpers
backend/      Scoring service
public/        Static assets
```

## Security

Do not commit secrets. `.env.local`, database URLs, API keys, session secrets, and private keys stay on the machine or in the host’s environment settings. `.env.example` lists names only. Local account files under `data/` are ignored.

If a secret was ever pasted into chat, a screenshot, or git, rotate it.

## License

© Kredoof. All rights reserved.
