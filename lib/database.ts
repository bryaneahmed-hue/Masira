import { db } from "@/prisma/db";

const DEV_USER_EMAIL = "bryan@personal-ai.local";

export async function getOrCreateDevUser() {
  const existingUsers = await db.orm.public.User
    .select("id", "email", "name")
    .where({ email: DEV_USER_EMAIL })
    .all();

  if (existingUsers.length > 0) {
    return existingUsers[0];
  }

  return db.orm.public.User.create({
    email: DEV_USER_EMAIL,
    name: "Bryan",
  });
}

export async function getOrCreateConversation(userId: number) {
  const conversations = await db.orm.public.Conversation
    .select("id", "title", "createdAt", "updatedAt")
    .where({ userId })
    .orderBy((c) => c.updatedAt.desc())
    .limit(1)
    .all();

  if (conversations.length > 0) {
    return conversations[0];
  }

  return db.orm.public.Conversation.create({
    userId,
    title: "Personal Assistant",
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
