"""Phase-1 heuristic scorecard (expert rules, no training data required).

This is what Credora should ship on day one, before any real repayment
outcomes exist. Every rule is a documented underwriting judgement, so the
score is fully explainable and easy to defend to a lender or regulator.
Once real loan outcomes accumulate, the ML scorecard (model.py) replaces the
weights but keeps the same features and the same explanation contract.
"""

from __future__ import annotations

# Each entry: feature -> list of (threshold_fn, points, reason_text).
# Points are added to a 300 base; the design maxes out near 850.


def score_heuristic(f: dict[str, float]) -> tuple[int, list[dict]]:
    """Return (score, reasons). Reasons carry signed point contributions."""
    base = 300
    contribs: list[dict] = []

    def add(points: int, reason: str, feature: str):
        contribs.append({"feature": feature, "points": points, "reason": reason})

    # Scale
    m = f["monthly_inflow_median"]
    if m >= 5000:
        add(90, "Strong verified monthly revenue (≥ $5,000)", "monthly_inflow_median")
    elif m >= 2000:
        add(70, "Solid verified monthly revenue (≥ $2,000)", "monthly_inflow_median")
    elif m >= 500:
        add(45, "Moderate verified monthly revenue (≥ $500)", "monthly_inflow_median")
    else:
        add(15, "Low verified monthly revenue (< $500)", "monthly_inflow_median")

    # Consistency
    cv = f["inflow_cv"]
    if cv <= 0.25:
        add(80, "Very consistent month-to-month revenue", "inflow_cv")
    elif cv <= 0.50:
        add(55, "Reasonably consistent revenue", "inflow_cv")
    elif cv <= 0.90:
        add(25, "Volatile revenue pattern", "inflow_cv")
    else:
        add(0, "Highly volatile revenue pattern", "inflow_cv")

    # Growth
    g = f["inflow_growth"]
    if g >= 0.05:
        add(35, "Revenue is growing", "inflow_growth")
    elif g >= -0.02:
        add(20, "Revenue is stable", "inflow_growth")
    else:
        add(0, "Revenue is declining", "inflow_growth")

    # Cash flow
    ncf = f["net_cashflow_ratio"]
    if ncf >= 0.25:
        add(45, "Healthy retained cash flow", "net_cashflow_ratio")
    elif ncf >= 0.05:
        add(30, "Positive cash flow", "net_cashflow_ratio")
    else:
        add(0, "Outflows consume nearly all inflows", "net_cashflow_ratio")

    # Repayment history — the strongest single signal in credit.
    if f["has_repayment_history"]:
        r = f["on_time_repayment_rate"]
        if r >= 0.95:
            add(120, "Excellent on-chain repayment record (≥95% on time)", "on_time_repayment_rate")
        elif r >= 0.80:
            add(80, "Good on-chain repayment record", "on_time_repayment_rate")
        elif r >= 0.60:
            add(25, "Mixed repayment record with late payments", "on_time_repayment_rate")
        else:
            add(-60, "Poor repayment record — frequent late/missed payments", "on_time_repayment_rate")
    else:
        add(20, "No prior loan history observed (neutral)", "has_repayment_history")

    # Tenure & activity
    if f["wallet_age_months"] >= 12:
        add(45, "12+ months of verifiable history", "wallet_age_months")
    elif f["wallet_age_months"] >= 6:
        add(30, "6–12 months of verifiable history", "wallet_age_months")
    else:
        add(5, "Short transaction history (< 6 months)", "wallet_age_months")

    if f["active_months_ratio"] >= 0.9:
        add(25, "Continuously active, no dormant gaps", "active_months_ratio")
    elif f["active_months_ratio"] >= 0.7:
        add(12, "Mostly active with some dormant months", "active_months_ratio")
    else:
        add(0, "Frequent dormant periods", "active_months_ratio")

    # Network diversification
    if f["counterparty_count"] >= 20 and f["counterparty_hhi"] <= 0.20:
        add(35, "Well-diversified customer base", "counterparty_hhi")
    elif f["counterparty_count"] >= 8:
        add(20, "Moderately diversified counterparties", "counterparty_hhi")
    else:
        add(0, "Revenue concentrated in very few counterparties", "counterparty_hhi")

    # Integrity penalties
    if f["circular_flow_ratio"] > 0.30:
        add(-150, "High circular flow with same counterparties — possible wash trading", "circular_flow_ratio")
    elif f["circular_flow_ratio"] > 0.12:
        add(-60, "Elevated circular transaction flow", "circular_flow_ratio")

    if f["max_inflow_share"] > 0.5:
        add(-40, "Single transaction dominates inflows — unverified spike", "max_inflow_share")

    score = base + sum(c["points"] for c in contribs)
    score = int(max(300, min(850, score)))
    return score, contribs
