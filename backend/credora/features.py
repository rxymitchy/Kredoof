"""Feature engineering: raw on-chain transactions -> underwriting signals.

This is the heart of the ML system. Every feature is computed from verifiable
transaction rows, so every score can be traced back to tx hashes. Features are
grouped the way an underwriter thinks:

- Scale        : how much money moves through the business
- Consistency  : is revenue stable month to month
- Cash flow    : does more come in than go out
- Repayment    : has this wallet repaid loans before, and on time
- Network      : how diversified are the counterparties
- Integrity    : signals of wash trading / self-dealing
- Tenure       : how long and how continuously the wallet has been active
"""

from __future__ import annotations

import numpy as np
import pandas as pd

FEATURE_NAMES = [
    "monthly_inflow_median",
    "inflow_cv",
    "inflow_growth",
    "net_cashflow_ratio",
    "active_months_ratio",
    "wallet_age_months",
    "tx_per_month",
    "counterparty_count",
    "counterparty_hhi",
    "repayment_count",
    "on_time_repayment_rate",
    "has_repayment_history",
    "circular_flow_ratio",
    "max_inflow_share",
]

# Human-readable descriptions used for reason codes and the API response.
FEATURE_DESCRIPTIONS = {
    "monthly_inflow_median": "Median monthly revenue received on-chain",
    "inflow_cv": "Month-to-month revenue volatility (lower is steadier)",
    "inflow_growth": "Revenue growth trend across active months",
    "net_cashflow_ratio": "Share of inflows retained after outflows",
    "active_months_ratio": "Share of months with any activity (vs dormant)",
    "wallet_age_months": "Length of observable transaction history",
    "tx_per_month": "Average transactions per month",
    "counterparty_count": "Number of distinct paying counterparties",
    "counterparty_hhi": "Revenue concentration among counterparties (higher = riskier)",
    "repayment_count": "Number of loan repayment transactions observed",
    "on_time_repayment_rate": "Share of loan repayments made on time",
    "has_repayment_history": "Whether any prior loan repayment activity exists",
    "circular_flow_ratio": "Share of volume cycled with the same counterparties (wash-trading signal)",
    "max_inflow_share": "Largest single inflow as a share of total (spike signal)",
}


def compute_features(tx: pd.DataFrame, as_of: pd.Timestamp | None = None) -> dict[str, float]:
    """Compute the underwriting feature vector for one wallet.

    Expects columns: ts, direction ('in'/'out'), amount_usd, counterparty, kind.
    Returns a plain dict so it can be stored as JSONB in PostgreSQL alongside
    the tx hashes that produced it.
    """
    tx = tx.copy()
    tx["ts"] = pd.to_datetime(tx["ts"])
    as_of = as_of or tx["ts"].max()

    if tx.empty:
        return {name: 0.0 for name in FEATURE_NAMES}

    inflows = tx[tx["direction"] == "in"]
    outflows = tx[tx["direction"] == "out"]

    first_ts, last_ts = tx["ts"].min(), tx["ts"].max()
    wallet_age_months = max(1.0, (as_of - first_ts).days / 30.44)

    month = tx["ts"].dt.to_period("M")
    monthly_in = inflows.groupby(inflows["ts"].dt.to_period("M"))["amount_usd"].sum()
    span_months = max(1, len(pd.period_range(month.min(), month.max(), freq="M")))
    active_months_ratio = len(month.unique()) / span_months

    monthly_inflow_median = float(monthly_in.median()) if len(monthly_in) else 0.0
    mean_in = float(monthly_in.mean()) if len(monthly_in) else 0.0
    inflow_cv = float(monthly_in.std() / mean_in) if len(monthly_in) > 1 and mean_in > 0 else 1.5

    # Growth: slope of monthly inflows normalised by mean, clipped to a sane range.
    if len(monthly_in) >= 3 and mean_in > 0:
        x = np.arange(len(monthly_in))
        slope = np.polyfit(x, monthly_in.values.astype(float), 1)[0]
        inflow_growth = float(np.clip(slope / mean_in, -1.0, 1.0))
    else:
        inflow_growth = 0.0

    total_in = float(inflows["amount_usd"].sum())
    total_out = float(outflows["amount_usd"].sum())
    net_cashflow_ratio = (total_in - total_out) / total_in if total_in > 0 else -1.0
    net_cashflow_ratio = float(np.clip(net_cashflow_ratio, -1.0, 1.0))

    # Counterparty network (paying counterparties only).
    cp_volumes = inflows.groupby("counterparty")["amount_usd"].sum()
    counterparty_count = float(len(cp_volumes))
    shares = cp_volumes / cp_volumes.sum() if cp_volumes.sum() > 0 else cp_volumes
    counterparty_hhi = float((shares**2).sum()) if len(shares) else 1.0

    # Repayment behaviour, read directly from labelled repayment transfers.
    repays = tx[tx["kind"].str.startswith("loan_repayment", na=False)]
    repayment_count = float(len(repays))
    on_time = float((repays["kind"] == "loan_repayment_ontime").sum())
    on_time_repayment_rate = on_time / repayment_count if repayment_count else 0.0
    has_repayment_history = 1.0 if repayment_count > 0 else 0.0

    # Integrity: volume exchanged with counterparties that appear on BOTH sides
    # of the ledger (money in and money out) — the classic wash-trading shape.
    in_cps = set(inflows["counterparty"])
    out_cps = set(outflows["counterparty"])
    both = in_cps & out_cps
    if total_in > 0 and both:
        circular_in = float(inflows[inflows["counterparty"].isin(both)]["amount_usd"].sum())
        # Exclude legitimate lender flows (disbursement in, repayment out).
        lender_cps = set(tx[tx["kind"] != "transfer"]["counterparty"])
        circular_legit = float(
            inflows[inflows["counterparty"].isin(both & lender_cps)]["amount_usd"].sum()
        )
        circular_flow_ratio = max(0.0, (circular_in - circular_legit) / total_in)
    else:
        circular_flow_ratio = 0.0

    max_inflow_share = (
        float(inflows["amount_usd"].max() / total_in) if total_in > 0 else 0.0
    )

    tx_per_month = float(len(tx) / wallet_age_months)

    return {
        "monthly_inflow_median": round(monthly_inflow_median, 2),
        "inflow_cv": round(inflow_cv, 4),
        "inflow_growth": round(inflow_growth, 4),
        "net_cashflow_ratio": round(net_cashflow_ratio, 4),
        "active_months_ratio": round(float(active_months_ratio), 4),
        "wallet_age_months": round(float(wallet_age_months), 2),
        "tx_per_month": round(tx_per_month, 2),
        "counterparty_count": counterparty_count,
        "counterparty_hhi": round(counterparty_hhi, 4),
        "repayment_count": repayment_count,
        "on_time_repayment_rate": round(on_time_repayment_rate, 4),
        "has_repayment_history": has_repayment_history,
        "circular_flow_ratio": round(circular_flow_ratio, 4),
        "max_inflow_share": round(max_inflow_share, 4),
    }


def feature_frame(wallets) -> pd.DataFrame:
    """Feature matrix + labels for a list of WalletProfile objects."""
    rows = []
    for w in wallets:
        f = compute_features(w.transactions)
        f["label_default"] = w.label_default
        f["archetype"] = w.archetype
        rows.append(f)
    return pd.DataFrame(rows)
