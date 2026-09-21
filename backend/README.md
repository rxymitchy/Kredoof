# Kredoof scoring API

This folder is the scoring service. It reads wallet payments (USDC / USDT) and returns a plain credit result the website can show: score, limit, risk in words, and a short report.

It is not the website, and it does not lend money. The live API is https://backend-sigma-silk-84.vercel.app (`app.py` is the Vercel entry).

Today it scores **one chain** (Avalanche C-Chain). More chains later.

```
payments → features → score → yes / no / how much
```

---

## Run it locally

From this `backend/` folder:

```bash
pip install -r requirements.txt
python -m kredoof.train
python -m uvicorn kredoof.api:app --host 127.0.0.1 --port 8471
```

- http://127.0.0.1:8471 — small demo page for the engine
- http://127.0.0.1:8471/docs — API docs

The real screens are on the Next.js app. Point the website at this server with `NEXT_PUBLIC_API_URL=http://127.0.0.1:8471`. If the API is down, the site can still show the sample result.

`python -m kredoof.train` builds a local model in `artifacts/` (not in git). Each machine trains its own copy.

---

## What the website calls

CORS allows localhost and `*.vercel.app`.

| Call | What it does |
| --- | --- |
| `GET /api/health` | Is the API up? |
| `GET /api/kredoof/profile` | Sample profile the website already knows how to draw |
| `POST /api/kredoof/profile` | Same shape, from real transfers you send |
| `GET /api/demo-wallets` | Built-in sample wallets |
| `GET /api/score/{wallet_id}` | Raw score for a sample wallet |
| `POST /api/score` | Score a list of transfers |
| `GET /api/model-card` | Training notes |

---

## What’s in the folder

| File | Role |
| --- | --- |
| `kredoof/synth.py` | Fake wallets for local demos until a live indexer is wired |
| `kredoof/features.py` | Turns payments into signals (how often money moves, who they pay, warning signs) |
| `kredoof/scorecard.py` | Simple rules score when there is no real loan history yet |
| `kredoof/model.py` | Learned score once there are labelled outcomes |
| `kredoof/decision.py` | Limit and yes/no policy, kept separate from the model |
| `kredoof/profile.py` | JSON shape the website expects |
| `kredoof/api.py` | FastAPI routes |
| `static/index.html` | Engine demo page |

---

## How scoring is meant to grow

There are not enough real repaid loans to train on yet. So the live path can use a documented rules score first. Every real loan that later repays or defaults becomes a label. Then the same features can be trained properly.

The score itself should stay a number you can repeat. A language model must not set the score.

Local training numbers on fake wallets only check that the pipeline runs. They are not proof the score works in the real world.
