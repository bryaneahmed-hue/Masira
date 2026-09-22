import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import {
  getOrCreateDevUser,
  getConversationForUser,
} from "@/lib/database";
import { db } from "@/prisma/db";
import { getStructuredMemory } from "@/lib/structured-memory";

export async function POST(request: Request) {
  try {
    const { messages, conversationId } = await request.json();

    if (!conversationId) {
      return Response.json(
        { error: "conversationId is required." },
        { status: 400 }
      );
    }

    const numericConversationId = Number(conversationId);

    if (!Number.isInteger(numericConversationId)) {
      return Response.json(
        { error: "Invalid conversationId." },
        { status: 400 }
      );
    }

    const user = await getOrCreateDevUser();

    const conversation = await getConversationForUser(
      numericConversationId,
      user.id
    );

    if (!conversation) {
      return Response.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }

    const structuredMemory = await getStructuredMemory();

    const latestUserMessage = [...messages]
      .reverse()
      .find((message: any) => message.role === "user");

    if (latestUserMessage) {
      const textParts = latestUserMessage.parts
        ?.filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("");

      if (textParts) {
        await db.orm.public.Message.create({
          role: "user",
          content: textParts,
          conversationId: conversation.id,
        });
      }
    }

    const storedMessages = await db.orm.public.Message
      .select("role", "content", "createdAt")
      .where({ conversationId: conversation.id })
      .orderBy((message) => message.createdAt.asc())
      .all();

    const historyMessages = storedMessages.map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));

    const result = streamText({
      model: openai("gpt-5.6"),

      system: `You are Bryan's personal AI assistant.

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
${JSON.stringify(structuredMemory.businesses, null, 2)}

Projects:
${JSON.stringify(structuredMemory.projects, null, 2)}

Organisations:
${JSON.stringify(structuredMemory.organisations, null, 2)}

People:
${JSON.stringify(structuredMemory.people, null, 2)}

Project-Person relationships:
${JSON.stringify(structuredMemory.projectPeople, null, 2)}

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
