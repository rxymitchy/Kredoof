import {
  USDC_AVALANCHE,
  USDT_AVALANCHE,
} from "@/lib/constants";
import type { OnChainTransaction, TokenAsset } from "@/types";

const GLACIER = "https://glacier-api.avax.network/v1/chains/43114/addresses";
const ALLOWED = new Set([
  USDC_AVALANCHE.toLowerCase(),
  USDT_AVALANCHE.toLowerCase(),
]);

type GlacierTx = {
  txHash: string;
  blockTimestamp: number;
  from?: { address?: string };
  to?: { address?: string };
  value: string;
  erc20Token?: { address?: string; symbol?: string; decimals?: number };
};

function toAmount(value: string, decimals: number): number {
  const raw = BigInt(value);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = raw / base;
  const frac = raw % base;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, 6);
  return Number(`${whole}.${fracStr}`);
}

export async function fetchAvalancheStableTransfers(
  address: string
): Promise<OnChainTransaction[]> {
  const wallet = address.toLowerCase();
  const items: OnChainTransaction[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 8; page++) {
    const url = new URL(`${GLACIER}/${address}/transactions:listErc20`);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) {
      throw new Error(`Avalanche indexer returned ${res.status}`);
    }
    const body = (await res.json()) as {
      transactions?: GlacierTx[];
      nextPageToken?: string;
    };
    for (const row of body.transactions ?? []) {
      const token = (row.erc20Token?.address ?? "").toLowerCase();
      if (!ALLOWED.has(token)) continue;
      const from = (row.from?.address ?? "0x") as `0x${string}`;
      const to = (row.to?.address ?? "0x") as `0x${string}`;
      const symbol = (row.erc20Token?.symbol ?? "USDC").toUpperCase();
      const asset: TokenAsset = symbol.includes("USDT") ? "USDT" : "USDC";
      const decimals = row.erc20Token?.decimals ?? 6;
      const direction = to.toLowerCase() === wallet ? "in" : "out";
      const ts = row.blockTimestamp > 1e12
        ? row.blockTimestamp
        : row.blockTimestamp * 1000;
      items.push({
        id: row.txHash,
        hash: row.txHash as `0x${string}`,
        timestamp: new Date(ts).toISOString(),
        from,
        to,
        asset,
        amount: toAmount(row.value, decimals),
        direction,
        network: "Avalanche",
        verificationStatus: "unverified",
      });
    }
    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }
  return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

const AVALANCHE_RPC = "https://api.avax.network/ext/bc/C/rpc";

type RpcReceipt = {
  id?: number;
  result?: { status?: string; transactionHash?: string } | null;
};

export async function confirmTransfersOnChain(
  txs: OnChainTransaction[]
): Promise<OnChainTransaction[]> {
  if (txs.length === 0) return [];
  const confirmed: OnChainTransaction[] = [];
  for (let i = 0; i < txs.length; i += 20) {
    const chunk = txs.slice(i, i + 20);
    const payload = chunk.map((tx, index) => ({
      jsonrpc: "2.0",
      id: index,
      method: "eth_getTransactionReceipt",
      params: [tx.hash],
    }));
    const res = await fetch(AVALANCHE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error("Could not check those payments on the chain");
    }
    const raw = await res.json();
    const rows: RpcReceipt[] = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object"
        ? chunk.map((tx, index) => ({ id: index, result: null }))
        : [];
    if (!Array.isArray(raw)) {
      for (let index = 0; index < chunk.length; index++) {
        const single = await fetch(AVALANCHE_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_getTransactionReceipt",
            params: [chunk[index].hash],
          }),
        });
        const one = (await single.json()) as RpcReceipt;
        if (one.result && one.result.status === "0x1") {
          confirmed.push({ ...chunk[index], verificationStatus: "verified" });
        }
      }
      continue;
    }
    const byId = new Map(rows.map((row) => [row.id ?? 0, row]));
    chunk.forEach((tx, index) => {
      const receipt = byId.get(index)?.result;
      if (receipt && receipt.status === "0x1") {
        confirmed.push({ ...tx, verificationStatus: "verified" });
      }
    });
  }
  return confirmed;
}

export function toScoreRows(_address: string, txs: OnChainTransaction[]) {
  return txs.map((tx) => ({
    tx_hash: tx.hash,
    ts: tx.timestamp,
    direction: tx.direction,
    amount_usd: tx.amount,
    counterparty: tx.direction === "in" ? tx.from : tx.to,
    kind: "transfer",
    token: tx.asset,
  }));
}
