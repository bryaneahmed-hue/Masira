import { db } from "@/prisma/db";

export async function getStructuredMemory() {
  const businesses = await db.orm.public.Business
    .select(
      "id",
      "name",
      "role",
      "description",
      "market",
      "businessModel",
      "stage",
      "priority"
    )
    .all();

  const projects = await db.orm.public.Project
    .select(
      "id",
      "name",
      "description",
      "status",
      "priority",
      "businessId",
      "organisationId"
    )
    .all();

  const organisations = await db.orm.public.Organisation
    .select(
      "id",
      "name",
      "type",
      "description",
      "country",
      "website"
    )
    .all();

  const people = await db.orm.public.Person
    .select(
      "id",
      "name",
      "title",
      "email",
      "phone",
      "role",
      "notes",
      "organisationId"
    )
    .all();

  const projectPeople = await db.orm.public.ProjectPerson
    .select(
      "id",
      "projectId",
      "personId",
      "role",
      "notes"
    )
    .all();

  return {
    businesses,
    projects,
    organisations,
    people,
    projectPeople,
  };
}
