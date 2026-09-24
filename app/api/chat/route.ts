import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getAuthenticatedUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request-validation";
import { getConversationForUser } from "@/lib/database";
import { db } from "@/prisma/db";
import { getStructuredMemory } from "@/lib/structured-memory";
import { writeAuditLog } from "@/lib/audit";

function extractText(message: unknown): string {
  if (!message || typeof message !== "object") {
    return "";
  }

  const item = message as Record<string, unknown>;

  if (typeof item.content === "string") {
    return item.content;
  }

  if (Array.isArray(item.parts)) {
    return item.parts
      .filter(
        (part): part is { type: "text"; text: string } =>
          Boolean(part) &&
          typeof part === "object" &&
          (part as Record<string, unknown>).type === "text" &&
          typeof (part as Record<string, unknown>).text === "string"
      )
      .map((part) => part.text)
      .join("");
  }

  return "";
}

function filterRelevantMemory(
  memory: Awaited<ReturnType<typeof getStructuredMemory>>,
  query: string
) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/[^\p{L}\p{N}@.-]/gu, ""))
    .filter((term) => term.length >= 3);

  if (terms.length === 0) {
    return memory;
  }

  const matches = (value: unknown) => {
    if (typeof value !== "string") {
      return false;
    }

    const normalized = value.toLowerCase();

    return terms.some((term) => normalized.includes(term));
  };

  const businesses = memory.businesses.filter((business) =>
    Object.values(business).some(matches)
  );

  const projects = memory.projects.filter((project) =>
    Object.values(project).some(matches)
  );

  const organisations = memory.organisations.filter((organisation) =>
    Object.values(organisation).some(matches)
  );

  const people = memory.people.filter((person) =>
    Object.values(person).some(matches)
  );

  const projectIds = new Set(projects.map((project) => project.id));
  const personIds = new Set(people.map((person) => person.id));

  const projectPeople = memory.projectPeople.filter(
    (relationship) =>
      projectIds.has(relationship.projectId) ||
      personIds.has(relationship.personId)
  );

  return {
    businesses,
    projects,
    organisations,
    people,
    projectPeople,
  };
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return Response.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (!rateLimit(`chat:${user.id}`, 20, 60_000)) {
      return Response.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await readJsonBody(request);

    if (!body || typeof body !== "object") {
      return Response.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const candidate = body as Record<string, unknown>;
    const conversationId = Number(candidate.conversationId);
    const messages = Array.isArray(candidate.messages)
      ? candidate.messages
      : [];

    if (
      !Number.isInteger(conversationId) ||
      conversationId <= 0
    ) {
      return Response.json(
        { error: "Invalid conversationId." },
        { status: 400 }
      );
    }

    if (messages.length === 0 || messages.length > 50) {
      return Response.json(
        { error: "Invalid message count." },
        { status: 400 }
      );
    }

    const conversation = await getConversationForUser(
      conversationId,
      user.id
    );

    if (!conversation) {
      return Response.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }

    const latestUserMessage = [...messages]
      .reverse()
      .find(
        (message) =>
          Boolean(message) &&
          typeof message === "object" &&
          (message as Record<string, unknown>).role === "user"
      );

    const latestUserText = extractText(latestUserMessage);

    if (!latestUserText) {
      return Response.json(
        { error: "A user message is required." },
        { status: 400 }
      );
    }

    if (latestUserText.length > 20_000) {
      return Response.json(
        { error: "Message is too long." },
        { status: 400 }
      );
    }

    await db.orm.public.Message.create({
      role: "user",
      content: latestUserText,
      conversationId: conversation.id,
    });

    const storedMessages = await db.orm.public.Message
      .select("role", "content", "createdAt")
      .where({ conversationId: conversation.id })
      .orderBy((message) => message.createdAt.asc())
      .all();

    const historyMessages = storedMessages.map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));

    const structuredMemory = await getStructuredMemory();
    const relevantMemory = filterRelevantMemory(
      structuredMemory,
      latestUserText
    );

    await writeAuditLog({
      userId: user.id,
      event: "conversation_created",
      metadata: {
        conversationId: conversation.id,
      },
    });

    const result = streamText({
      model: openai("gpt-5.6"),

      system: `You are Masira, Bryan Ahmed's personal AI assistant.

Rules:

- Respond in the same language as the user unless asked otherwise.
- If the user mixes Arabic and English, respond naturally using the same mixture when appropriate.
- Be concise, practical, direct and professional.
- Do not sound robotic or overly formal.
- Do not claim that this application cannot save or persist conversations.
- Never claim to have taken an action unless the system actually performed it.

Structured memory authority: The supplied structured database memory is authoritative for businesses, projects, organisations, people, relationships, roles, statuses, and priorities. Do not supplement or merge structured database facts with general conversational memory unless the user explicitly asks for previous conversations. If a requested structured fact is not present in the database memory, say it is not currently recorded. Conversational context may help understand intent but must not be presented as a structured database fact. If using conversational context, clearly identify it as previously discussed context.

Structured business memory:

Businesses:
${JSON.stringify(relevantMemory.businesses, null, 2)}

Projects:
${JSON.stringify(relevantMemory.projects, null, 2)}

Organisations:
${JSON.stringify(relevantMemory.organisations, null, 2)}

People:
${JSON.stringify(relevantMemory.people, null, 2)}

Project-Person relationships:
${JSON.stringify(relevantMemory.projectPeople, null, 2)}

Relationship rules:

- businessId identifies the Business associated with a Project.
- organisationId identifies the Organisation associated with a Project or Person.
- projectId and personId identify people specifically involved in a project.
- A Person may belong to an Organisation without being involved in every project belonging to that Organisation.
- Use the Project-Person role and notes when answering questions about a person's involvement in a specific project.
- If a relationship or person is not present in the supplied memory, do not invent it.
- Do not infer personal details, roles, contact information, project involvement, or organisational relationships that are not explicitly present in the supplied memory.

Use this structured memory when relevant. Do not invent relationships, projects, business details, or other facts that are not present in the supplied memory.`,

      messages: historyMessages,

      onEnd: async ({ text }) => {
        if (text) {
          await db.orm.public.Message.create({
            role: "assistant",
            content: text,
            conversationId: conversation.id,
          });

          await writeAuditLog({
            userId: user.id,
            event: "ai_response_created",
            metadata: {
              conversationId: conversation.id,
            },
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("AI error:", error);

    return Response.json(
      { error: "Something went wrong while contacting the AI." },
      { status: 500 }
    );
  }
}
