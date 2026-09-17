# Kredoof Backend — ML Underwriting Engine

The machine-learning core of Kredoof: it turns raw on-chain transaction
history (USDC/USDT transfers) into an explainable, lender-ready credit
decision. This folder is self-contained and runs independently of the
frontend.

```
raw transactions → engineered features → risk score (PD) → decision + reason codes + tx-hash evidence
```

## Run it standalone

From inside this `backend/` folder:

```bash
pip install -r requirements.txt
python -m kredoof.train                       # trains the scorecard (~20s)
python -m uvicorn kredoof.api:app --port 8471
```

Open http://127.0.0.1:8471 for the built-in demo dashboard, or
http://127.0.0.1:8471/docs for the interactive API docs. (The demo dashboard
is a development tool for inspecting the engine — the real UI is the React
frontend.)

This folder already lives in the main Kredoof repo. Production is
https://backend-sigma-silk-84.vercel.app (`app.py` is the Vercel entrypoint).

## Connecting the React frontend

CORS allows localhost and `*.vercel.app`. The Next.js app should call:

- `GET  /api/kredoof/profile` — frontend-shaped payload (applicant, txs, score, risk, report)
- `POST /api/kredoof/profile` — same payload from submitted live transfers
- `GET  /api/health` — liveness
- `GET  /api/demo-wallets` — list the six synthetic demo wallets
- `GET  /api/score/{wallet_id}?engine=ml|heuristic` — raw engine score
- `POST /api/score` — score real data: `{ wallet_id, transactions: [...], engine }`
- `GET  /api/model-card` — training metrics and model coefficients

Set `NEXT_PUBLIC_API_URL` on the frontend to this server's origin. If the
API is down, the UI falls back to the sample (mock) profile.

The `artifacts/` directory (trained model) is generated locally by
`python -m kredoof.train` and is git-ignored, so each environment trains
its own copy. You can also `pip install -r requirements.txt` (same pins as
`pyproject.toml`).

## What's inside

| Module | Role |
|---|---|
| `kredoof/synth.py` | Synthetic wallet generator across 6 borrower archetypes (steady merchant, growing creator, volatile trader, thin file, risky borrower, wash trader). Stands in for the real Avalanche indexer until it exists — the contract is just the transaction DataFrame schema. |
| `kredoof/features.py` | Feature engineering (Pandas): 14 underwriting signals across scale, consistency, cash flow, repayment, counterparty network, integrity and tenure. Every feature is traceable to tx hashes. |
| `kredoof/scorecard.py` | **Phase 1** — heuristic expert scorecard. No training data required; ship this on day one. |
| `kredoof/model.py` | **Phase 2** — logistic-regression scorecard trained on labelled outcomes. Outputs calibrated probability of default, mapped to a 300–850 score, with exact per-feature reason codes. |
| `kredoof/decision.py` | Business policy layer: risk bands, credit limits (multiple of median monthly revenue), KES conversion, hard decline overlays (wash trading, insufficient history). Kept out of the model on purpose. |
| `kredoof/api.py` | FastAPI service: Kredoof profile, `POST /api/score`, demo wallets, model card. |
| `kredoof/profile.py` | Maps engine output into the JSON the Next.js screens already expect. |
| `static/index.html` | Demo dashboard: score gauge, eligibility, reason codes, on-chain evidence. |

## The ML approach (and why it's staged)

**Phase 1 — heuristic scorecard (now).** You have no labelled loan outcomes
yet, so there is nothing to train on. Ship a documented, rules-based
scorecard. Its real job is to start the data flywheel: every loan it approves
produces a repaid/defaulted label.

**Phase 2 — logistic regression scorecard (first few hundred outcomes).**
Swap heuristic weights for learned ones, keeping the same features and the
same explanation contract. Logistic regression is the industry standard for
underwriting because it is calibrated (real PDs, which pricing and the 1%
success fee need), auditable, and self-explaining: with standardised inputs,
each feature's contribution to the decision is just coefficient × value.

**Phase 3 — gradient boosting challenger (thousands of outcomes).**
XGBoost/LightGBM typically adds a few AUC points. Run it as a challenger and
only promote it once SHAP-based reason codes are in place.

**The LLM (OpenAI API) never sets the score.** The score must be
deterministic and reproducible. The agent's job is orchestration (fetch →
verify → feature-compute → score), narrative explanation of an already-made
decision, and continuous monitoring — re-scoring on new transactions and
flagging when a wallet crosses a credit threshold.

Fraud/integrity signals (circular flow, spike detection) act as **hard policy
overlays**, not score inputs alone — a wash trader can look statistically
great, so no score is allowed to override the flag.

## Current training metrics

Trained on 1,200 synthetic wallets (~560k transactions), 25% held-out test
set: **AUC 0.79, KS 0.51**. These numbers validate the pipeline, not the
model — the labels are synthetic. Real metrics come from real repayment
outcomes, which is exactly what the Phase-1 scorecard exists to collect.

## Next steps toward production

1. Replace `synth.py` with a real Avalanche C-Chain indexer (ERC-20 transfer
   logs for USDC/USDT via RPC or a data API), keeping the same DataFrame schema.
2. Persist features + decisions + tx-hash evidence in PostgreSQL.
3. Log every decision (features, model version, score) for backtesting and audit.
4. Add the monitoring loop: re-score wallets on new activity, alert on
   threshold crossings — the "agentic, continuous underwriting" differentiator.
5. Once ~200+ real loan outcomes exist, retrain Phase 2 on real labels and
   validate with out-of-time backtesting, calibration curves and PSI drift checks.
