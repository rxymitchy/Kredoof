"""Decision layer: score -> risk band, eligibility and lender-ready output.

Deliberately separate from the model: business policy (bands, limits, KES
conversion) changes far more often than the model does, and must never be
buried inside model weights.
"""

from __future__ import annotations

USD_TO_KES = 129.0  # peg for the prototype; make this a live rate in prod

RISK_BANDS = [
    (750, "Low", 4.0),
    (700, "Medium-Low", 3.0),
    (640, "Medium", 2.0),
    (580, "Medium-High", 1.0),
    (0, "High", 0.0),
]


def make_decision(score: int, pd_hat: float | None, features: dict) -> dict:
    band, multiple = next((b, m) for t, b, m in RISK_BANDS if score >= t)

    monthly_rev_usd = features.get("monthly_inflow_median", 0.0)
    limit_usd = monthly_rev_usd * multiple

    # Hard policy overlays that no score should override.
    declines = []
    if features.get("circular_flow_ratio", 0) > 0.30:
        declines.append("Wash-trading pattern detected — manual review required")
    if features.get("wallet_age_months", 0) < 3:
        declines.append("Insufficient history (< 3 months) — re-apply after more activity")

    eligible = multiple > 0 and not declines
    limit_kes = round(limit_usd * USD_TO_KES / 1000) * 1000 if eligible else 0

    return {
        "credit_score": score,
        "score_range": "300–850",
        "probability_of_default": round(pd_hat, 4) if pd_hat is not None else None,
        "risk_band": band,
        "eligible": eligible,
        "eligible_amount_kes": int(limit_kes),
        "eligible_amount_usd": round(limit_usd, 2) if eligible else 0,
        "policy_flags": declines,
        "policy": {
            "limit_basis": f"{multiple}x median monthly on-chain revenue",
            "fx_rate_usd_kes": USD_TO_KES,
        },
    }
