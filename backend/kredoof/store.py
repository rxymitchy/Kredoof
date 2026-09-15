"""SQLite accounts and loans for Kredoof.

Stored under /tmp on Vercel (ephemeral between cold starts) and
backend/data locally so signup is real, not a fake continue button.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import sqlite3
import time
import uuid
from pathlib import Path

_SALT = b"kredoof-v1"


def _db_path() -> Path:
    if os.environ.get("VERCEL"):
        return Path("/tmp/kredoof-accounts.db")
    path = Path(__file__).resolve().parent.parent / "data" / "kredoof.db"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute(
        """CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            wallet TEXT,
            created_at INTEGER NOT NULL
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS loans (
            id TEXT PRIMARY KEY,
            email TEXT,
            wallet TEXT NOT NULL,
            amount_usdc REAL NOT NULL,
            status TEXT NOT NULL,
            disburse_tx TEXT,
            repay_tx TEXT,
            created_at INTEGER NOT NULL
        )"""
    )
    conn.commit()
    for col, kind in (("first_name", "TEXT"), ("last_name", "TEXT")):
        try:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} {kind}")
            conn.commit()
        except sqlite3.OperationalError:
            pass
    return conn


def hash_password(password: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), _SALT, 120_000).hex()


def register(
    email: str,
    password: str,
    name: str,
    first_name: str = "",
    last_name: str = "",
) -> dict:
    email = email.strip().lower()
    first_name = (first_name or "").strip()
    last_name = (last_name or "").strip()
    name = (name or f"{first_name} {last_name}".strip() or email.split("@")[0]).strip()[:80]
    if not first_name or not last_name:
        raise ValueError("First name and last name are required")
    if "@" not in email or "." not in email.split("@")[-1] or len(email.split("@")[-1].split(".")[-1]) < 2:
        raise ValueError("Use an address like you@gmail.com")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    conn = _connect()
    try:
        conn.execute(
            """INSERT INTO users (email, password_hash, name, first_name, last_name, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (email, hash_password(password), name, first_name, last_name, int(time.time())),
        )
        conn.commit()
    except sqlite3.IntegrityError as exc:
        raise ValueError("An account with that email already exists") from exc
    finally:
        conn.close()
    return {
        "email": email,
        "name": name,
        "firstName": first_name,
        "lastName": last_name,
    }


def login(email: str, password: str) -> dict:
    email = email.strip().lower()
    conn = _connect()
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    finally:
        conn.close()
    if row is None:
        raise ValueError("No account for that email. Sign up first.")
    expected = row["password_hash"]
    actual = hash_password(password)
    if not hmac.compare_digest(expected, actual):
        raise ValueError("Wrong password")
    return {
        "email": row["email"],
        "name": row["name"],
        "firstName": row["first_name"] or "",
        "lastName": row["last_name"] or "",
        "wallet": row["wallet"],
    }


def bind_wallet(email: str, wallet: str) -> dict:
    email = email.strip().lower()
    wallet = wallet.lower()
    conn = _connect()
    try:
        conn.execute("UPDATE users SET wallet = ? WHERE email = ?", (wallet, email))
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    finally:
        conn.close()
    if row is None:
        raise ValueError("Unknown account")
    return {"email": row["email"], "name": row["name"], "wallet": row["wallet"]}


def open_loan(wallet: str, amount_usdc: float, email: str | None) -> dict:
    loan_id = str(uuid.uuid4())
    conn = _connect()
    try:
        conn.execute(
            """INSERT INTO loans (id, email, wallet, amount_usdc, status, created_at)
               VALUES (?, ?, ?, ?, 'approved', ?)""",
            (loan_id, email, wallet.lower(), amount_usdc, int(time.time())),
        )
        conn.commit()
    finally:
        conn.close()
    return {"id": loan_id, "wallet": wallet.lower(), "amount_usdc": amount_usdc, "status": "approved"}


def mark_disbursed(loan_id: str, tx_hash: str) -> dict:
    conn = _connect()
    try:
        conn.execute(
            "UPDATE loans SET status = 'drawn', disburse_tx = ? WHERE id = ?",
            (tx_hash, loan_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM loans WHERE id = ?", (loan_id,)).fetchone()
    finally:
        conn.close()
    if row is None:
        raise ValueError("Unknown loan")
    return dict(row)


def mark_repaid(loan_id: str, tx_hash: str) -> dict:
    conn = _connect()
    try:
        conn.execute(
            "UPDATE loans SET status = 'repaid', repay_tx = ? WHERE id = ?",
            (tx_hash, loan_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM loans WHERE id = ?", (loan_id,)).fetchone()
    finally:
        conn.close()
    if row is None:
        raise ValueError("Unknown loan")
    return dict(row)


def loans_for_wallet(wallet: str) -> list[dict]:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT * FROM loans WHERE wallet = ? ORDER BY created_at DESC",
            (wallet.lower(),),
        ).fetchall()
    finally:
        conn.close()
    return [dict(r) for r in rows]
