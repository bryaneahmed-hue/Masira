import { getAuthenticatedUser } from "@/lib/auth";
import { createConversation } from "@/lib/database";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return Response.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const conversation = await createConversation(
      user.id,
      "New Conversation"
    );

    await writeAuditLog({
      userId: user.id,
      event: "conversation_created",
      metadata: {
        conversationId: conversation.id,
      },
    });

    return Response.json({
      id: conversation.id,
      title: conversation.title,
    });
  } catch (error) {
    console.error("Conversation creation error:", error);

    return Response.json(
      { error: "Unable to create conversation." },
      { status: 500 }
    );
  }
}
