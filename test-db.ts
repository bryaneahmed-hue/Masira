import {
  getOrCreateDevUser,
  getOrCreateConversation,
} from "./lib/database";
import { db } from "./prisma/db";

async function main() {
  const user = await getOrCreateDevUser();

  const conversation = await getOrCreateConversation(user.id);

  const message = await db.orm.public.Message.create({
    role: "user",
    content: "Hello, this is my first saved message.",
    conversationId: conversation.id,
  });

  console.log("Message saved successfully:");
  console.log(message);

  const messages = await db.orm.public.Message
    .select(
      "id",
      "role",
      "content",
      "createdAt",
      "conversationId"
    )
    .where({ conversationId: conversation.id })
    .all();

  console.log("\nMessages in conversation:");
  console.log(messages);
}

main().catch((error) => {
  console.error("Database test failed:");
  console.error(error);
  process.exit(1);
});