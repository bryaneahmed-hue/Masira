import { db } from "./prisma/db";

async function main() {
  const existing = await db.orm.public.Organisation
    .select("id", "name")
    .where({ name: "Unite Oil & Gas International" })
    .all();

  if (existing.length > 0) {
    console.log("Already exists: Unite Oil & Gas International");
    return;
  }

  const organisation = await db.orm.public.Organisation.create({
    name: "Unite Oil & Gas International",
    type: "Oil & Gas",
    description:
      "Organisation associated with the UOGI Benin project.",
    country: "Benin",
  });

  console.log(
    `Created: ${organisation.name} (id: ${organisation.id})`
  );
}

main().catch((error) => {
  console.error("Organisation seed failed:");
  console.error(error);
  process.exit(1);
});
