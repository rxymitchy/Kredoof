# Credora Backend — ML Underwriting Engine

The machine-learning core of Credora: it turns raw on-chain transaction
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
python -m credora.train                       # trains the scorecard (~20s)
python -m uvicorn credora.api:app --port 8471
```

Open http://127.0.0.1:8471 for the built-in demo dashboard, or
http://127.0.0.1:8471/docs for the interactive API docs. (The demo dashboard
is a development tool for inspecting the engine — the real UI is the React
frontend.)

## Connecting the React frontend

CORS is open in development, so the frontend can run on its own dev server
and call this API directly:

- `GET  /api/demo-wallets` — list the six synthetic demo wallets
- `GET  /api/score/{wallet_id}?engine=ml|heuristic` — score a demo wallet
- `POST /api/score` — score real data: `{ wallet_id, transactions: [...], engine }`
- `GET  /api/model-card` — training metrics and model coefficients

The decision payload includes `credit_score`, `probability_of_default`,
`risk_band`, `eligible_amount_kes`, per-feature `reasons`, and an `evidence`
block with traceable tx hashes — everything the UI needs to render a
decision screen.

## Adding this to the main repo

Copy this whole `backend/` folder into the root of the existing Credora
repository, next to the frontend. It brings its own README (this file) and
touches nothing outside its folder. The `artifacts/` directory (trained
model) is generated locally by `python -m credora.train` and is
git-ignored, so each environment trains its own copy.

## What's inside

| Module | Role |
|---|---|
| `credora/synth.py` | Synthetic wallet generator across 6 borrower archetypes (steady merchant, growing creator, volatile trader, thin file, risky borrower, wash trader). Stands in for the real Avalanche indexer until it exists — the contract is just the transaction DataFrame schema. |
| `credora/features.py` | Feature engineering (Pandas): 14 underwriting signals across scale, consistency, cash flow, repayment, counterparty network, integrity and tenure. Every feature is traceable to tx hashes. |
| `credora/scorecard.py` | **Phase 1** — heuristic expert scorecard. No training data required; ship this on day one. |
| `credora/model.py` | **Phase 2** — logistic-regression scorecard trained on labelled outcomes. Outputs calibrated probability of default, mapped to a 300–850 score, with exact per-feature reason codes. |
| `credora/decision.py` | Business policy layer: risk bands, credit limits (multiple of median monthly revenue), KES conversion, hard decline overlays (wash trading, insufficient history). Kept out of the model on purpose. |
| `credora/api.py` | FastAPI service: `POST /api/score` (raw transactions in, decision out), demo wallets, model card. |
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
