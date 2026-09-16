"""FastAPI surface for the Kredoof underwriting engine.

Endpoints
- GET  /                       demo dashboard
- GET  /api/health             liveness
- GET  /api/kredoof/profile    frontend-shaped underwriting payload
- GET  /api/demo-wallets       list synthetic demo wallets
- POST /api/score              score a wallet from raw transactions
- GET  /api/score/{id}         score one of the demo wallets by id
- GET  /api/model-card         training metrics + coefficients of the live model
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from dataclasses import dataclass

from . import model as model_mod
from . import store
from . import synth
from .decision import make_decision
from .features import FEATURE_DESCRIPTIONS, compute_features
from .profile import JUA_KALI, build_profile
from .scorecard import score_heuristic

app = FastAPI(title="Kredoof Underwriting Engine", version="0.1.0")

# Browser calls from local Next.js and the live Vercel app.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://kredoof.vercel.app",
        "https://kredoof-rxymitchys-projects.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

_state: dict = {}


def _ensure_ready() -> None:
    if "pipe" in _state:
        return
    if not model_mod.MODEL_PATH.exists():
        from .train import main as train_main
        train_main()
    _state["pipe"] = model_mod.load_model()
    _state["card"] = model_mod.load_card()
    wallets = synth.generate_demo_wallets()
    _state["demo"] = {w.wallet_id: w for w in wallets}
    _state["demo_by_archetype"] = {w.archetype: w for w in wallets}


@app.on_event("startup")
def startup() -> None:
    _ensure_ready()


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


class AccountRequest(BaseModel):
    email: str
    password: str
    name: str = ""
    first_name: str = ""
    last_name: str = ""
    phone: str = ""


class LoginRequest(BaseModel):
    password: str
    identifier: str = ""
    email: str = ""


class BindWalletRequest(BaseModel):
    email: str
    wallet: str


class LiveProfileRequest(BaseModel):
    wallet_id: str
    name: str = "On-chain business"
    owner: str = "Owner"
    email: str | None = None
    transactions: list[Transaction]
    engine: str = Field(default="ml", pattern="^(ml|heuristic)$")


@dataclass
class _LiveWallet:
    wallet_id: str
    archetype: str
    display_name: str
    transactions: pd.DataFrame


def _score_frame(wallet_id: str, tx: pd.DataFrame, engine: str) -> dict:
    _ensure_ready()
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


def _kredoof_profile(wallet, *, brand: dict | None = None) -> dict:
    payload = _score_frame(wallet.wallet_id, wallet.transactions, "ml")
    return build_profile(wallet, payload, brand=brand)


@app.get("/api/health")
def health():
    _ensure_ready()
    return {"ok": True}


@app.get("/api/kredoof/profile")
def kredoof_profile():
    """Frontend-shaped payload for the default demo (Jua Kali / steady merchant)."""
    _ensure_ready()
    wallet = _state["demo_by_archetype"].get("steady_merchant")
    if wallet is None:
        raise HTTPException(500, "Demo wallet missing")
    return _kredoof_profile(wallet, brand=JUA_KALI)


@app.get("/api/kredoof/profile/{wallet_id}")
def kredoof_profile_wallet(wallet_id: str):
    _ensure_ready()
    wallet = _state["demo"].get(wallet_id)
    if wallet is None:
        raise HTTPException(404, "Unknown demo wallet")
    brand = JUA_KALI if wallet.archetype == "steady_merchant" else None
    return _kredoof_profile(wallet, brand=brand)


@app.post("/api/kredoof/profile")
def kredoof_live_profile(req: LiveProfileRequest):
    """Score a real wallet's USDC/USDT transfers and return the frontend payload."""
    _ensure_ready()
    if not req.transactions:
        raise HTTPException(422, "No USDC/USDT transfers found for this wallet")
    tx = pd.DataFrame([t.model_dump() for t in req.transactions])
    tx["ts"] = pd.to_datetime(tx["ts"])
    payload = _score_frame(req.wallet_id, tx, req.engine)
    initials = "".join(part[0] for part in req.name.split()[:2]).upper() or "KW"
    brand = {
        "name": req.name,
        "owner": req.owner or (req.email.split("@")[0] if req.email else "Owner"),
        "initials": initials[:2],
        "sector": "On-chain activity",
        "location": "Avalanche C-Chain",
        "walletAddress": req.wallet_id,
        "network": "Avalanche",
    }
    wallet = _LiveWallet(
        wallet_id=req.wallet_id,
        archetype="live",
        display_name=req.name,
        transactions=tx,
    )
    return build_profile(wallet, payload, brand=brand)


@app.post("/api/accounts/register")
def accounts_register(req: AccountRequest):
    try:
        return store.register(
            req.email,
            req.password,
            req.name,
            req.first_name,
            req.last_name,
            req.phone,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/accounts/login")
def accounts_login(req: LoginRequest):
    try:
        return store.login(req.identifier or req.email, req.password)
    except ValueError as exc:
        raise HTTPException(401, str(exc)) from exc


@app.post("/api/accounts/bind-wallet")
def accounts_bind(req: BindWalletRequest):
    try:
        return store.bind_wallet(req.email, req.wallet)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/loans/{wallet}")
def list_loans(wallet: str):
    return store.loans_for_wallet(wallet)


class OpenLoanRequest(BaseModel):
    wallet: str
    amount_usdc: float
    email: str | None = None


@app.post("/api/loans")
def create_loan(req: OpenLoanRequest):
    return store.open_loan(req.wallet, req.amount_usdc, req.email)


class LoanTxRequest(BaseModel):
    tx_hash: str


@app.post("/api/loans/{loan_id}/disbursed")
def loan_disbursed(loan_id: str, req: LoanTxRequest):
    try:
        return store.mark_disbursed(loan_id, req.tx_hash)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc


@app.post("/api/loans/{loan_id}/repaid")
def loan_repaid(loan_id: str, req: LoanTxRequest):
    try:
        return store.mark_repaid(loan_id, req.tx_hash)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc


@app.get("/api/demo-wallets")
def demo_wallets():
    _ensure_ready()
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
    _ensure_ready()
    return _state["card"]


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
