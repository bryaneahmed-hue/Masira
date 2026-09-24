import { db } from "@/prisma/db";

export type AuditEvent =
  | "sign_in_requested"
  | "sign_in_succeeded"
  | "sign_in_failed"
  | "session_created"
  | "session_revoked"
  | "conversation_created"
  | "ai_response_created";

export async function writeAuditLog({
  userId,
  event,
  metadata,
}: {
  userId?: number;
  event: AuditEvent;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.orm.public.AuditLog.create({
      userId: userId ?? null,
      event,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
}
