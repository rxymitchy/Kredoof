"""Train the ML scorecard on the synthetic labelled population.

Run:  python -m credora.train
"""

from __future__ import annotations

from . import model, synth
from .features import feature_frame


def main() -> dict:
    print("Generating synthetic wallet population...")
    wallets = synth.generate_dataset(n_wallets=1200)
    print(f"  {len(wallets)} wallets, "
          f"{sum(len(w.transactions) for w in wallets):,} transactions")

    print("Engineering features...")
    df = feature_frame(wallets)
    print(f"  default rate: {df['label_default'].mean():.1%}")

    print("Training logistic scorecard...")
    card = model.train(df)
    m = card["metrics"]
    print(f"  AUC (test): {m['auc_test']}   KS: {m['ks_test']}   "
          f"n_train={m['n_train']} n_test={m['n_test']}")
    print(f"Saved model to {model.MODEL_PATH}")
    return card


if __name__ == "__main__":
    main()
