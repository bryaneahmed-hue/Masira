import { db } from "./prisma/db";

const businesses = [
  {
    name: "Masader Capital",
    role: "Managing Partner and CEO",
    description:
      "Financial and legal consultancy serving companies seeking capital, trade and transaction advisory.",
    market: "GCC, Africa, Europe",
    businessModel: "B2B",
    stage: "Operating",
    priority: "High",
  },
  {
    name: "Escrow Livery",
    role: "Founder and CEO",
    description:
      "Peer-to-peer safety infrastructure combining escrow, verification and delivery services.",
    market: "Scandinavia and EU",
    businessModel: "B2C",
    stage: "Fundraising",
    priority: "High",
  },
  {
    name: "Salimeen",
    role: "Founder and CEO",
    description:
      "Culturally and linguistically sensitive digital mental-care support for migrants from MENA living in Europe and the United States.",
    market: "Europe, USA, Middle East",
    businessModel: "B2C",
    stage: "Operating",
    priority: "High",
  },
];

async function main() {
  for (const business of businesses) {
    const existing = await db.orm.public.Business
      .select("id", "name")
      .where({ name: business.name })
      .all();

    if (existing.length > 0) {
      console.log(`Already exists: ${business.name}`);
      continue;
    }

    const created = await db.orm.public.Business.create(business);

    console.log(`Created: ${created.name} (id: ${created.id})`);
  }
}

main().catch((error) => {
  console.error("Business seed failed:");
  console.error(error);
  process.exit(1);
});
