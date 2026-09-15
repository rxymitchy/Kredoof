"""Map engine output into the JSON the Kredoof frontend already renders.

One payload, same field names as `types/` on the Next.js app. Keeps the UI
dumb: it fetches this object and does not need to know about scorecards.
"""

from __future__ import annotations

import pandas as pd

from .decision import USD_TO_KES

# Same applicant the live UI already shows, so the demo story stays intact.
JUA_KALI = {
    "name": "Jua Kali Leather Works",
    "owner": "J. Kamau",
    "initials": "JK",
    "sector": "Leather Goods",
    "location": "Nairobi, Kenya",
    "walletAddress": "0x7A3d4e8f12b90c45a67e81d93c4f00aabbcc91F2",
    "network": "Avalanche",
}

TX_CAP = 14


def _native(value):
    if hasattr(value, "item"):
        return value.item()
    return value


def _kes(usd: float) -> int:
    return int(round(float(usd) * USD_TO_KES))


def _kes_label(amount: int) -> str:
    if amount >= 1_000_000:
        millions = amount / 1_000_000
        text = f"{millions:.1f}".rstrip("0").rstrip(".")
        return f"KSh {text}M equivalent"
    return f"KSh {amount:,}"


def _short(addr: str) -> str:
    if len(addr) < 10:
        return addr
    return f"{addr[:5]}...{addr[-4:]}"


def _addr(value: str) -> str:
    raw = value[2:] if str(value).startswith("0x") else str(value)
    return "0x" + raw[:40].ljust(40, "0")


def _hash(value: str) -> str:
    raw = str(value)
    return raw if raw.startswith("0x") else "0x" + raw


def _clip100(value: float) -> int:
    return int(max(0, min(100, round(value))))


def _rating(score: int, *, inverted: bool = False) -> str:
    if inverted:
        if score >= 80:
            return "low"
        if score >= 60:
            return "medium"
        return "good"
    if score >= 90:
        return "excellent"
    if score >= 75:
        return "strong"
    if score >= 60:
        return "good"
    if score >= 40:
        return "medium"
    return "low"


def _band_ceiling(score: int) -> int:
    if score >= 800:
        return 2_000_000
    if score >= 740:
        return 750_000
    if score >= 670:
        return 250_000
    if score >= 580:
        return 50_000
    return 0


def _status(score: int) -> tuple[str, str]:
    if score >= 800:
        return "prime", "Prime"
    if score >= 740:
        return "established", "Established"
    return "building", "Building"


def _risk(band: str) -> tuple[str, str]:
    mapping = {
        "Low": ("low", "Low"),
        "Medium-Low": ("medium-low", "Medium-Low"),
        "Medium": ("medium", "Medium"),
        "Medium-High": ("medium", "Medium-High"),
        "High": ("high", "High"),
    }
    return mapping.get(band, ("medium", band or "Medium"))


def _method_scores(features: dict) -> dict[str, int]:
    age = float(features.get("wallet_age_months") or 0)
    tx_pm = float(features.get("tx_per_month") or 0)
    cv = float(features.get("inflow_cv") or 1)
    on_time = float(features.get("on_time_repayment_rate") or 0)
    cps = float(features.get("counterparty_count") or 0)
    circular = float(features.get("circular_flow_ratio") or 0)
    return {
        "wallet-age": _clip100(age / 24 * 100),
        "volume": _clip100(tx_pm / 40 * 100),
        "cash-flow": _clip100((1 - min(cv, 1.2) / 1.2) * 100),
        "repayment": _clip100(on_time * 100) if on_time else 40,
        "counterparties": _clip100(cps / 40 * 100),
        "risk-activity": _clip100(100 - circular * 250),
    }


def _monthly_series(tx) -> tuple[list[dict], list[dict]]:
    if tx is None or len(tx) == 0:
        return [], []
    frame = tx.copy()
    frame["ts"] = pd.to_datetime(frame["ts"])
    frame["month"] = frame["ts"].dt.strftime("%b")
    frame["period"] = frame["ts"].dt.to_period("M")
    grouped = frame.groupby("period")
    volume = []
    flows = []
    for period, chunk in grouped:
        month = chunk["month"].iloc[0]
        inflow = float(chunk.loc[chunk["direction"] == "in", "amount_usd"].sum())
        outflow = float(chunk.loc[chunk["direction"] == "out", "amount_usd"].sum())
        volume.append({"month": month, "volumeKsh": _kes(inflow + outflow)})
        flows.append({
            "month": month,
            "inflowsKsh": _kes(inflow),
            "outflowsKsh": _kes(outflow),
        })
    return volume[-12:], flows[-6:]


def _transactions(tx, wallet: str) -> list[dict]:
    if tx is None or len(tx) == 0:
        return []
    frame = tx.sort_values("ts", ascending=False).head(TX_CAP)
    items = []
    for i, row in enumerate(frame.itertuples(index=False), start=1):
        direction = row.direction
        counterparty = _addr(row.counterparty)
        token = str(getattr(row, "token", "USDC") or "USDC").upper()
        asset = "USDT" if token == "USDT" else "USDC"
        items.append({
            "id": f"tx-{i:02d}",
            "hash": _hash(row.tx_hash),
            "timestamp": pd.Timestamp(row.ts).isoformat(),
            "from": counterparty if direction == "in" else wallet,
            "to": wallet if direction == "in" else counterparty,
            "asset": asset,
            "amount": round(float(row.amount_usd), 2),
            "direction": direction,
            "network": "Avalanche",
            "verificationStatus": "verified",
        })
    return items


def build_profile(wallet, score_payload: dict, *, brand: dict | None = None) -> dict:
    """wallet is a synth.WalletProfile; score_payload is `_score_frame` output."""
    features = {k: _native(v) for k, v in (score_payload.get("features") or {}).items()}
    decision = score_payload.get("decision") or {}
    tx = wallet.transactions
    applicant = dict(brand or {
        "name": wallet.display_name or wallet.wallet_id,
        "owner": "Business owner",
        "initials": (wallet.display_name or "KW")[:2].upper(),
        "sector": wallet.archetype.replace("_", " ").title(),
        "location": "Nairobi, Kenya",
        "walletAddress": _addr(wallet.wallet_id),
        "network": "Avalanche",
    })
    wallet_addr = applicant["walletAddress"]
    score = int(decision.get("credit_score") or 300)
    status, status_label = _status(score)
    risk, risk_label = _risk(str(decision.get("risk_band") or "Medium"))
    engine_limit = int(decision.get("eligible_amount_kes") or 0)
    if not decision.get("eligible"):
        limit = 0
    else:
        cap = _band_ceiling(score)
        limit = min(engine_limit, cap) if cap else 0
    scores = _method_scores(features)
    volume, flows = _monthly_series(tx)
    items = _transactions(tx, wallet_addr)

    total_usd = float(pd.to_numeric(tx["amount_usd"], errors="coerce").fillna(0).sum()) if len(tx) else 0
    volume_kes = _kes(total_usd)
    age = int(round(float(features.get("wallet_age_months") or 0)))
    on_time = int(round(float(features.get("on_time_repayment_rate") or 0) * 100))
    counterparts = int(features.get("counterparty_count") or 0)
    months = max(age, 1)
    avg_monthly = int(round(volume_kes / months)) if months else 0
    assets = sorted({row["asset"] for row in items}) or ["USDC"]
    source = "engine"

    financial = {
        "totalTransactions": int(len(tx)),
        "transactionVolumeKsh": volume_kes,
        "transactionVolumeLabel": _kes_label(volume_kes),
        "averageMonthlyVolumeKsh": avg_monthly,
        "activeCounterparties": counterparts,
        "onTimeRepaymentPercent": on_time,
        "walletAgeMonths": age,
        "monthlyVolume": volume,
        "inflowsVsOutflows": flows,
        "source": source,
    }
    credit = {
        "score": score,
        "scoreMax": 850,
        "status": status,
        "statusLabel": status_label,
        "risk": risk,
        "riskLabel": risk_label,
        "recommendedLimitKsh": limit,
        "recommendedLimitLabel": f"KSh {limit:,}" if limit else "Not eligible",
        "rationale": [
            {"label": "Transaction Activity", "rating": _rating(scores["volume"])},
            {"label": "Cash Flow Consistency", "rating": _rating(scores["cash-flow"])},
            {"label": "Repayment History", "rating": _rating(scores["repayment"])},
            {"label": "Counterparty Diversity", "rating": _rating(scores["counterparties"])},
            {"label": "Risk Indicators", "rating": _rating(scores["risk-activity"], inverted=True)},
        ],
        "methodology": [
            {"id": "wallet-age", "label": "Wallet age & continuity", "weightPercent": 15, "scoreOutOf100": scores["wallet-age"]},
            {"id": "volume", "label": "Transaction volume & frequency", "weightPercent": 25, "scoreOutOf100": scores["volume"]},
            {"id": "cash-flow", "label": "Cash-flow consistency", "weightPercent": 20, "scoreOutOf100": scores["cash-flow"]},
            {"id": "repayment", "label": "On-chain repayment history", "weightPercent": 20, "scoreOutOf100": scores["repayment"]},
            {"id": "counterparties", "label": "Counterparty diversity", "weightPercent": 10, "scoreOutOf100": scores["counterparties"]},
            {"id": "risk-activity", "label": "Dispute / reversal / risk activity", "weightPercent": 10, "scoreOutOf100": scores["risk-activity"]},
        ],
        "source": source,
    }
    risk_analysis = {
        "overall": risk,
        "overallLabel": risk_label,
        "factors": [
            {"id": "cash-flow", "label": "Cash Flow Consistency", "rating": _rating(scores["cash-flow"])},
            {"id": "repayment", "label": "Repayment History", "rating": _rating(scores["repayment"])},
            {"id": "diversity", "label": "Counterparty Diversity", "rating": _rating(scores["counterparties"])},
            {"id": "concentration", "label": "Transaction Concentration", "rating": _rating(scores["counterparties"])},
            {"id": "suspicious", "label": "Suspicious Activity", "rating": _rating(scores["risk-activity"], inverted=True)},
            {"id": "circular", "label": "Circular Transaction Risk", "rating": _rating(scores["risk-activity"], inverted=True)},
        ],
        "source": source,
        "disclaimer": "Indicators come from the Kredoof scorecard on synthetic or submitted transfers. This is not live fraud detection.",
    }
    report = {
        "title": "KREDOOF CREDIT REPORT",
        "applicantName": applicant["name"],
        "sector": applicant["sector"],
        "location": applicant["location"],
        "walletDisplay": _short(wallet_addr),
        "network": "Avalanche",
        "score": score,
        "scoreMax": 850,
        "riskLabel": risk_label,
        "recommendedLimitLabel": credit["recommendedLimitLabel"],
        "basis": "This decision is based on verified on-chain transaction activity analyzed by Kredoof.",
        "disclaimer": "Kredoof provides credit decision support. Final KYC, lending approval and disbursement remain the responsibility of the lender.",
        "source": source,
    }

    return {
        "applicant": applicant,
        "financial": financial,
        "decision": credit,
        "risk": risk_analysis,
        "report": report,
        "pricing": {
            "assessmentFeeRangeKsh": "KSh 50–150",
            "successFeePercent": 1,
        },
        "continuous": {
            "currentStatus": status_label,
            "currentLimitLabel": credit["recommendedLimitLabel"],
            "nextMilestoneStatus": "Prime",
            "nextMilestoneLimitLabel": "KSh 2,000,000",
            "isVisionPreview": True,
        },
        "walletSummary": {
            "wallet": {
                "address": wallet_addr,
                "network": "avalanche",
                "networkLabel": "Avalanche",
                "displayAddress": _short(wallet_addr),
            },
            "transactionCount": int(len(tx)),
            "assets": assets,
            "walletAgeMonths": age,
        },
        "transactions": {
            "items": items,
            "totalCount": int(len(tx)),
            "source": source,
        },
        "engine": {
            "wallet_id": wallet.wallet_id,
            "archetype": wallet.archetype,
            "model_version": score_payload.get("model_version"),
            "raw_decision": decision,
            "reasons": score_payload.get("reasons") or [],
        },
        "source": source,
    }
