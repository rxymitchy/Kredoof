import { migrateFromBlob } from "../lib/persist";

/** One-off: copy old Vercel Blob JSON accounts into Neon. Needs DATABASE_URL. */
async function main() {
  const result = await migrateFromBlob();
  console.log(
    `Postgres ready. users=${result.users} loans=${result.loans} leads=${result.leads}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
