import { NextResponse } from "next/server";
import { confirmTransfersOnChain, fetchAvalancheStableTransfers } from "@/lib/avalanche";

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address || !address.startsWith("0x")) {
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
  }
  try {
    const listed = await fetchAvalancheStableTransfers(address);
    const items = await confirmTransfersOnChain(listed);
    return NextResponse.json({
      items,
      totalCount: items.length,
      source: "engine",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Indexer failed" },
      { status: 502 }
    );
  }
}
