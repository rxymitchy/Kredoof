import { createPublicClient, decodeEventLog, http, parseAbiItem } from "viem";
import { avalanche } from "viem/chains";
import { KREDOOF_TREASURY, USDT_AVALANCHE } from "@/lib/constants";
import { usdtFromKes } from "@/lib/format";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Confirm a USDT transfer on Avalanche landed in the Kredoof treasury. */
export async function verifyAvalancheUsdtDeposit(input: {
  hash: string;
  kes: number;
}): Promise<{ from: string; usdt: number }> {
  const hash = input.hash.trim() as `0x${string}`;
  if (!hash.startsWith("0x") || hash.length !== 66) {
    throw new Error("That wallet payment is missing");
  }
  const expected = usdtFromKes(input.kes);
  const client = createPublicClient({
    chain: avalanche,
    transport: http(),
  });
  let receipt: Awaited<ReturnType<typeof client.getTransactionReceipt>> | null =
    null;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      receipt = await client.getTransactionReceipt({ hash });
      break;
    } catch {
      await sleep(1500);
    }
  }
  if (!receipt) throw new Error("Avalanche has not confirmed that payment yet");
  if (receipt.status !== "success") {
    throw new Error("That wallet payment did not go through");
  }
  const treasury = KREDOOF_TREASURY.toLowerCase();
  const token = USDT_AVALANCHE.toLowerCase();
  let from = "";
  let raw = BigInt(0);
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== token) continue;
    try {
      const decoded = decodeEventLog({
        abi: [transferEvent],
        data: log.data,
        topics: log.topics,
      }) as { args: { from: string; to: string; value: bigint } };
      if (decoded.args.to.toLowerCase() !== treasury) continue;
      from = decoded.args.from;
      raw = decoded.args.value;
      break;
    } catch {
      continue;
    }
  }
  if (!from || raw <= BigInt(0)) {
    throw new Error("That payment did not send USDT to Kredoof");
  }
  const usdt = Number(raw) / 1_000_000;
  if (Math.abs(usdt - expected) > 0.02) {
    throw new Error(
      `That payment was ${usdt} USDT. This deposit is for ${expected} USDT.`
    );
  }
  return { from, usdt };
}
