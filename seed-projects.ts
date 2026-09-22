import { db } from "./prisma/db";

async function main() {
  const businesses = await db.orm.public.Business
    .select("id", "name")
    .all();

  const masader = businesses.find((b) => b.name === "Masader Capital");
  const escrow = businesses.find((b) => b.name === "Escrow Livery");

  if (!masader) {
    throw new Error("Masader Capital was not found.");
  }

  if (!escrow) {
    throw new Error("Escrow Livery was not found.");
  }

  const projects = [
    {
      name: "UOGI Benin",
      description:
        "Financial and legal advisory services for Unite Oil & Gas International in Benin.",
      status: "Active",
      priority: "High",
      businessId: masader.id,
    },
    {
      name: "Fundraising",
      description:
        "Fundraising activities and investor engagement for Escrow Livery.",
      status: "Active",
      priority: "High",
      businessId: escrow.id,
    },
  ];

  for (const project of projects) {
    const existing = await db.orm.public.Project
      .select("id", "name")
      .where({ name: project.name, businessId: project.businessId })
      .all();

    if (existing.length > 0) {
      console.log(`Already exists: ${project.name}`);
      continue;
    }

    const created = await db.orm.public.Project.create(project);

    console.log(
      `Created: ${created.name} (id: ${created.id}, businessId: ${created.businessId})`
    );
  }
}

main().catch((error) => {
  console.error("Project seed failed:");
  console.error(error);
  process.exit(1);
});
