import { db } from "@/prisma/db";

export async function getOrCreateOwnerUser() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();

  if (!email) {
    throw new Error("OWNER_EMAIL is not configured.");
  }

  const existingUsers = await db.orm.public.User
    .select("id", "email", "name")
    .where({ email })
    .limit(1)
    .all();

  if (existingUsers.length > 0) {
    return existingUsers[0];
  }

  return db.orm.public.User.create({
    email,
    name: "Bryan",
  });
}

export async function createConversation(
  userId: number,
  title = "New Conversation"
) {
  return db.orm.public.Conversation.create({
    userId,
    title,
  });
}

export async function getConversationForUser(
  conversationId: number,
  userId: number
) {
  const conversations = await db.orm.public.Conversation
    .select("id", "title", "createdAt", "updatedAt", "userId")
    .where({
      id: conversationId,
      userId,
    })
    .limit(1)
    .all();

  return conversations.length > 0 ? conversations[0] : null;
}
