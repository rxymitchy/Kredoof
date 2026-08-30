"""Synthetic on-chain transaction generator.

We do not yet have repayment outcomes from real borrowers, so this module
simulates wallets across realistic borrower archetypes (steady merchants,
growing creators, thin files, wash traders, ...). It serves two purposes:

1. It gives the feature-engineering and scoring pipeline realistic input
   shaped exactly like decoded Avalanche USDC/USDT transfer data.
2. It produces labelled training data (default / no default) whose labels are
   driven by the same behaviours a lender cares about, so the trained model
   learns sensible, explainable relationships until real loan outcomes exist.

Replace this module with a real chain indexer (e.g. Avalanche C-Chain ERC-20
transfer logs via an RPC node or Covalent/Glacier API) without touching the
rest of the pipeline: the contract is just the transaction DataFrame schema.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

TX_COLUMNS = ["tx_hash", "ts", "direction", "amount_usd", "counterparty", "kind", "token"]

ARCHETYPES = [
    "steady_merchant",
    "growing_creator",
    "volatile_trader",
    "thin_file",
    "risky_borrower",
    "wash_trader",
]


@dataclass
class WalletProfile:
    wallet_id: str
    archetype: str
    label_default: int  # 1 = defaulted on a simulated loan
    display_name: str = ""
    transactions: pd.DataFrame = field(default_factory=pd.DataFrame)


def _fake_hash(rng: np.random.Generator) -> str:
    return "0x" + hashlib.sha256(rng.bytes(16)).hexdigest()


def _fake_address(rng: np.random.Generator) -> str:
    return "0x" + hashlib.sha256(rng.bytes(16)).hexdigest()[:40]


def generate_wallet(
    archetype: str,
    rng: np.random.Generator,
    end: pd.Timestamp | None = None,
) -> WalletProfile:
    """Simulate one wallet's transaction history and its default label."""
    end = end or pd.Timestamp.utcnow().tz_localize(None).normalize()

    params = {
        "steady_merchant": dict(months=18, base_inflow=4200, growth=0.01, noise=0.15,
                                n_counterparties=28, repay_ontime=0.97, dormancy=0.02),
        "growing_creator": dict(months=12, base_inflow=1500, growth=0.09, noise=0.30,
                                n_counterparties=45, repay_ontime=0.92, dormancy=0.05),
        "volatile_trader": dict(months=14, base_inflow=6000, growth=0.00, noise=0.85,
                                n_counterparties=12, repay_ontime=0.80, dormancy=0.15),
        "thin_file":       dict(months=3, base_inflow=900, growth=0.02, noise=0.35,
                                n_counterparties=5, repay_ontime=None, dormancy=0.10),
        "risky_borrower":  dict(months=10, base_inflow=2500, growth=-0.06, noise=0.55,
                                n_counterparties=9, repay_ontime=0.55, dormancy=0.25),
        "wash_trader":     dict(months=8, base_inflow=9000, growth=0.02, noise=0.20,
                                n_counterparties=3, repay_ontime=0.85, dormancy=0.05),
    }[archetype]

    months = params["months"]
    start = end - pd.DateOffset(months=months)
    counterparties = [_fake_address(rng) for _ in range(params["n_counterparties"])]
    # Skewed counterparty weights: a few customers dominate, like real MSMEs.
    weights = rng.dirichlet(np.ones(len(counterparties)) * 0.6)

    rows: list[dict] = []
    token = rng.choice(["USDC", "USDT"], p=[0.7, 0.3])

    for m in range(months):
        month_start = start + pd.DateOffset(months=m)
        if rng.random() < params["dormancy"]:
            continue  # dormant month
        monthly_total = params["base_inflow"] * (1 + params["growth"]) ** m
        monthly_total *= max(0.05, 1 + rng.normal(0, params["noise"]))
        n_tx = max(1, int(rng.poisson(max(2, monthly_total / 150))))
        amounts = rng.dirichlet(np.ones(n_tx)) * monthly_total
        for amt in amounts:
            if amt < 1:
                continue
            ts = month_start + pd.Timedelta(days=float(rng.uniform(0, 28)),
                                            hours=float(rng.uniform(0, 24)))
            rows.append(dict(
                tx_hash=_fake_hash(rng), ts=ts, direction="in",
                amount_usd=round(float(amt), 2),
                counterparty=str(rng.choice(counterparties, p=weights)),
                kind="transfer", token=token,
            ))
        # Outflows: expenses at 55-90% of inflow.
        out_ratio = float(rng.uniform(0.55, 0.90))
        n_out = max(1, int(rng.poisson(max(1, n_tx * 0.4))))
        out_amounts = rng.dirichlet(np.ones(n_out)) * monthly_total * out_ratio
        for amt in out_amounts:
            if amt < 1:
                continue
            ts = month_start + pd.Timedelta(days=float(rng.uniform(0, 28)))
            rows.append(dict(
                tx_hash=_fake_hash(rng), ts=ts, direction="out",
                amount_usd=round(float(amt), 2),
                counterparty=_fake_address(rng),
                kind="transfer", token=token,
            ))

    # Wash traders recycle funds through the same few counterparties.
    if archetype == "wash_trader":
        partner = counterparties[0]
        for m in range(months):
            month_start = start + pd.DateOffset(months=m)
            for _ in range(int(rng.integers(4, 9))):
                amt = round(float(rng.uniform(800, 3000)), 2)
                t0 = month_start + pd.Timedelta(days=float(rng.uniform(0, 27)))
                rows.append(dict(tx_hash=_fake_hash(rng), ts=t0, direction="in",
                                 amount_usd=amt, counterparty=partner,
                                 kind="transfer", token=token))
                rows.append(dict(tx_hash=_fake_hash(rng),
                                 ts=t0 + pd.Timedelta(hours=float(rng.uniform(1, 20))),
                                 direction="out", amount_usd=round(amt * 0.98, 2),
                                 counterparty=partner, kind="transfer", token=token))

    # Prior loan cycle: disbursement in, weekly repayments out (on time or late).
    repay_ontime = params["repay_ontime"]
    if repay_ontime is not None and months >= 6:
        lender = _fake_address(rng)
        loan_amt = round(params["base_inflow"] * float(rng.uniform(0.5, 1.2)), 2)
        loan_ts = start + pd.DateOffset(months=2)
        rows.append(dict(tx_hash=_fake_hash(rng), ts=loan_ts, direction="in",
                         amount_usd=loan_amt, counterparty=lender,
                         kind="loan_disbursement", token=token))
        n_inst = 10
        for i in range(n_inst):
            due = loan_ts + pd.Timedelta(weeks=i + 1)
            on_time = rng.random() < repay_ontime
            delay = 0.0 if on_time else float(rng.uniform(4, 21))
            if rng.random() < (0.02 if repay_ontime > 0.9 else 0.15):
                continue  # missed installment entirely
            rows.append(dict(
                tx_hash=_fake_hash(rng), ts=due + pd.Timedelta(days=delay),
                direction="out", amount_usd=round(loan_amt * 1.08 / n_inst, 2),
                counterparty=lender,
                kind="loan_repayment_ontime" if on_time else "loan_repayment_late",
                token=token,
            ))

    df = pd.DataFrame(rows, columns=TX_COLUMNS).sort_values("ts").reset_index(drop=True)

    # Latent default probability driven by the behaviours the model should learn.
    base_pd = {
        "steady_merchant": 0.04, "growing_creator": 0.08, "volatile_trader": 0.22,
        "thin_file": 0.30, "risky_borrower": 0.55, "wash_trader": 0.45,
    }[archetype]
    label = int(rng.random() < base_pd)

    wallet_id = _fake_address(rng)
    return WalletProfile(wallet_id=wallet_id, archetype=archetype,
                         label_default=label, transactions=df)


def generate_dataset(n_wallets: int = 1200, seed: int = 7) -> list[WalletProfile]:
    """Generate a labelled population for training/validation."""
    rng = np.random.default_rng(seed)
    mix = {
        "steady_merchant": 0.28, "growing_creator": 0.22, "volatile_trader": 0.16,
        "thin_file": 0.14, "risky_borrower": 0.12, "wash_trader": 0.08,
    }
    wallets: list[WalletProfile] = []
    for archetype, share in mix.items():
        for _ in range(int(n_wallets * share)):
            wallets.append(generate_wallet(archetype, rng))
    return wallets


DEMO_NAMES = {
    "steady_merchant": "Mama Njeri Wholesale (steady merchant)",
    "growing_creator": "Kito Studios (growing creator)",
    "volatile_trader": "Volta Imports (volatile trader)",
    "thin_file": "New Duka Online (thin file, 3 months)",
    "risky_borrower": "Haraka Logistics (missed repayments)",
    "wash_trader": "Circular Ventures (wash-trading pattern)",
}


def generate_demo_wallets(seed: int = 42) -> list[WalletProfile]:
    """One representative wallet per archetype, for the demo dashboard."""
    rng = np.random.default_rng(seed)
    wallets = []
    for archetype in ARCHETYPES:
        w = generate_wallet(archetype, rng)
        w.display_name = DEMO_NAMES[archetype]
        wallets.append(w)
    return wallets
