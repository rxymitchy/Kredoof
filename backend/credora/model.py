"""Phase-2 ML scorecard: logistic regression trained on labelled outcomes.

Why logistic regression and not a deep net / LLM:
- Credit underwriting must be explainable per-decision (reason codes) and
  stable under audit. A calibrated logistic scorecard is the industry
  standard for exactly this reason.
- Per-applicant reason codes fall out of the model directly: with
  standardised inputs, each feature's contribution to the log-odds is just
  coefficient x standardised value. No post-hoc explainer needed.
- The probability of default (PD) it outputs is what pricing, limits and the
  1% success-fee economics should be built on — a score alone is not.

Gradient boosting (XGBoost/LightGBM) typically adds a few AUC points later;
run it as a challenger model and only promote it with SHAP-based reason
codes once outcomes data is large enough (thousands of loans).
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .features import FEATURE_DESCRIPTIONS, FEATURE_NAMES

ARTIFACT_DIR = Path(__file__).resolve().parent.parent / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "model.joblib"
CARD_PATH = ARTIFACT_DIR / "model_card.json"

# Score scaling: score 650 == 9:1 good/bad odds, and every ~63 points doubles
# the odds. Chosen so a ~4% PD borrower lands near 740 and a 50% PD borrower
# near 450, mirroring the ranges lenders are used to reading.
PDO = 63.0
BASE_SCORE = 650.0
BASE_ODDS = 9.0
FACTOR = PDO / np.log(2)
OFFSET = BASE_SCORE - FACTOR * np.log(BASE_ODDS)


def pd_to_score(pd_hat: float) -> int:
    pd_hat = float(np.clip(pd_hat, 1e-5, 1 - 1e-5))
    odds_good = (1 - pd_hat) / pd_hat
    score = OFFSET + FACTOR * np.log(odds_good)
    return int(np.clip(round(score), 300, 850))


def train(feature_df, seed: int = 7) -> dict:
    """Train, validate and persist the scorecard. Returns the model card."""
    X = feature_df[FEATURE_NAMES].values.astype(float)
    y = feature_df["label_default"].values.astype(int)

    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.25, random_state=seed, stratify=y
    )

    pipe = Pipeline([
        ("scaler", StandardScaler()),
        # No class re-weighting: we need calibrated probabilities of default,
        # not just rank-ordering, and a ~20% base rate is not badly imbalanced.
        ("clf", LogisticRegression(max_iter=2000, C=0.5)),
    ])
    pipe.fit(X_tr, y_tr)

    auc_test = float(roc_auc_score(y_te, pipe.predict_proba(X_te)[:, 1]))
    auc_train = float(roc_auc_score(y_tr, pipe.predict_proba(X_tr)[:, 1]))

    # KS statistic — standard credit-risk separation measure.
    from sklearn.metrics import roc_curve
    fpr, tpr, _ = roc_curve(y_te, pipe.predict_proba(X_te)[:, 1])
    ks = float(np.max(tpr - fpr))

    coefs = pipe.named_steps["clf"].coef_[0]
    card = {
        "model_type": "logistic_regression_scorecard",
        "features": FEATURE_NAMES,
        "coefficients": {n: round(float(c), 4) for n, c in zip(FEATURE_NAMES, coefs)},
        "metrics": {
            "auc_train": round(auc_train, 4),
            "auc_test": round(auc_test, 4),
            "ks_test": round(ks, 4),
            "n_train": int(len(y_tr)),
            "n_test": int(len(y_te)),
            "default_rate": round(float(y.mean()), 4),
        },
        "score_scaling": {"base_score": BASE_SCORE, "base_odds": BASE_ODDS, "pdo": PDO},
        "training_data": "synthetic archetype population (replace with real loan outcomes)",
    }

    ARTIFACT_DIR.mkdir(exist_ok=True)
    joblib.dump(pipe, MODEL_PATH)
    CARD_PATH.write_text(json.dumps(card, indent=2))
    return card


def load_model():
    return joblib.load(MODEL_PATH)


def load_card() -> dict:
    return json.loads(CARD_PATH.read_text())


def score_ml(pipe, features: dict[str, float]) -> tuple[int, float, list[dict]]:
    """Score one wallet. Returns (score, probability_of_default, reason codes).

    Reason codes are exact log-odds contributions: coef_j * z_j, where z_j is
    the standardised feature value. Negative contribution = pushes PD down
    (good for the borrower); positive = pushes PD up.
    """
    x = np.array([[features[n] for n in FEATURE_NAMES]], dtype=float)
    scaler = pipe.named_steps["scaler"]
    clf = pipe.named_steps["clf"]
    z = scaler.transform(x)[0]
    contributions = clf.coef_[0] * z

    pd_hat = float(pipe.predict_proba(x)[0, 1])
    score = pd_to_score(pd_hat)

    reasons = []
    for name, contrib, raw in zip(FEATURE_NAMES, contributions, x[0]):
        reasons.append({
            "feature": name,
            "description": FEATURE_DESCRIPTIONS[name],
            "value": round(float(raw), 4),
            # Positive log-odds contribution increases default risk, so flip
            # the sign to express "points toward the borrower's score".
            "impact": round(float(-contrib), 4),
        })
    reasons.sort(key=lambda r: abs(r["impact"]), reverse=True)
    return score, pd_hat, reasons
