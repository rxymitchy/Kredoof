"""FastAPI surface for the Credora underwriting engine.

Endpoints
- GET  /                  demo dashboard
- GET  /api/demo-wallets  list synthetic demo wallets
- POST /api/score         score a wallet from raw transactions
- GET  /api/score/{id}    score one of the demo wallets by id
- GET  /api/model-card    training metrics + coefficients of the live model
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import model as model_mod
from . import synth
from .decision import make_decision
from .features import FEATURE_DESCRIPTIONS, compute_features
from .scorecard import score_heuristic

app = FastAPI(title="Credora Underwriting Engine", version="0.1.0")

# Open CORS so the React frontend (running on its own dev server/port) can
# call this API during development. Restrict to the real frontend origin in
# production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

_state: dict = {}


@app.on_event("startup")
def startup() -> None:
    if not model_mod.MODEL_PATH.exists():
        from .train import main as train_main
        train_main()
    _state["pipe"] = model_mod.load_model()
    _state["card"] = model_mod.load_card()
    _state["demo"] = {w.wallet_id: w for w in synth.generate_demo_wallets()}


class Transaction(BaseModel):
    tx_hash: str
    ts: str
    direction: str = Field(pattern="^(in|out)$")
    amount_usd: float
    counterparty: str
    kind: str = "transfer"
    token: str = "USDC"


class ScoreRequest(BaseModel):
    wallet_id: str
    transactions: list[Transaction]
    engine: str = Field(default="ml", pattern="^(ml|heuristic)$")


def _score_frame(wallet_id: str, tx: pd.DataFrame, engine: str) -> dict:
    features = compute_features(tx)

    if engine == "heuristic":
        score, contribs = score_heuristic(features)
        pd_hat = None
        reasons = [
            {"feature": c["feature"],
             "description": FEATURE_DESCRIPTIONS.get(c["feature"], c["feature"]),
             "value": features.get(c["feature"]),
             "impact": c["points"],
             "reason": c["reason"]}
            for c in sorted(contribs, key=lambda c: abs(c["points"]), reverse=True)
        ]
    else:
        score, pd_hat, reasons = model_mod.score_ml(_state["pipe"], features)

    decision = make_decision(score, pd_hat, features)

    inflow_hashes = tx[tx["direction"] == "in"].nlargest(5, "amount_usd")["tx_hash"].tolist()
    return {
        "wallet_id": wallet_id,
        "engine": engine,
        "decision": decision,
        "reasons": reasons[:8],
        "features": features,
        "evidence": {
            "transaction_count": int(len(tx)),
            "first_activity": str(tx["ts"].min()) if len(tx) else None,
            "last_activity": str(tx["ts"].max()) if len(tx) else None,
            "sample_tx_hashes": inflow_hashes,
            "note": "Every feature above is derived from these on-chain transfers "
                    "and is traceable to the underlying transaction hashes.",
        },
        "model_version": _state["card"]["model_type"] if engine == "ml" else "heuristic_scorecard_v1",
    }


@app.get("/api/demo-wallets")
def demo_wallets():
    out = []
    for w in _state["demo"].values():
        out.append({
            "wallet_id": w.wallet_id,
            "display_name": w.display_name,
            "archetype": w.archetype,
            "transaction_count": len(w.transactions),
        })
    return out


@app.get("/api/score/{wallet_id}")
def score_demo(wallet_id: str, engine: str = "ml"):
    w = _state["demo"].get(wallet_id)
    if w is None:
        raise HTTPException(404, "Unknown demo wallet")
    if engine not in ("ml", "heuristic"):
        raise HTTPException(422, "engine must be 'ml' or 'heuristic'")
    return _score_frame(w.wallet_id, w.transactions, engine)


@app.post("/api/score")
def score(req: ScoreRequest):
    if not req.transactions:
        raise HTTPException(422, "At least one transaction is required")
    tx = pd.DataFrame([t.model_dump() for t in req.transactions])
    tx["ts"] = pd.to_datetime(tx["ts"])
    return _score_frame(req.wallet_id, tx, req.engine)


@app.get("/api/model-card")
def model_card():
    return _state["card"]


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
