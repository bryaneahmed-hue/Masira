import { db } from "./prisma/db";

async function main() {
  const businesses = await db.orm.public.Business
    .select(
      "id",
      "name",
      "role",
      "market",
      "businessModel",
      "stage",
      "priority"
    )
    .all();

  console.log("\nBusinesses in database:");
  console.log(businesses);
}

main().catch((error) => {
  console.error("Verification failed:");
  console.error(error);
  process.exit(1);
});
