import { db } from "@/prisma/db";
import {
  clearSessionCookie,
  getAuthenticatedUser,
  hashToken,
  SESSION_COOKIE,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";

  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;

    if (part.slice(0, index).trim() === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(index + 1).trim()) || null;
    }
  }

  return null;
}

export async function POST(request: Request) {
  const headers = new Headers();
  headers.append("Set-Cookie", clearSessionCookie());

  try {
    const rawToken = readSessionToken(request);

    if (rawToken) {
      const user = await getAuthenticatedUser(request);

      await db.orm.public.Session
        .where({ tokenHash: hashToken(rawToken) })
        .delete();

      if (user) {
        await writeAuditLog({
          userId: user.id,
          event: "session_revoked",
        });
      }
    }
  } catch (error) {
    console.error("Logout error:", error);
  }

  return Response.json({ ok: true }, { headers });
}
