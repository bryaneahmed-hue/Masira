import {
  createConversation,
  getOrCreateDevUser,
} from "@/lib/database";

export async function POST() {
  try {
    const user = await getOrCreateDevUser();

    const conversation = await createConversation(
      user.id,
      "New Conversation"
    );

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
