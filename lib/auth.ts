import crypto from "node:crypto";
import { db } from "@/prisma/db";

const SESSION_COOKIE = "masira_session";
const SESSION_DAYS = 30;

export function getOwnerEmail(): string {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();

  if (!email) {
    throw new Error("OWNER_EMAIL is not configured.");
  }

  return email;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createRandomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: number) {
  const rawToken = createRandomToken();
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  );

  await db.orm.public.Session.create({
    tokenHash,
    userId,
    expiresAt: expiresAt.toISOString(),
  });

  return {
    token: rawToken,
    expiresAt,
  };
}

export async function getAuthenticatedUser(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  const cookies = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;

    const name = part.slice(0, index).trim();
    if (!name) continue;

    const value = decodeURIComponent(part.slice(index + 1).trim());
    cookies.set(name, value);
  }

  const rawToken = cookies.get(SESSION_COOKIE);

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);

  const sessions = await db.orm.public.Session
    .select("id", "userId", "expiresAt")
    .where({ tokenHash })
    .limit(1)
    .all();

  const session = sessions[0];

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await db.orm.public.Session
      .where({ id: session.id })
      .delete();

    return null;
  }

  const users = await db.orm.public.User
    .select("id", "email", "name")
    .where({ id: session.userId })
    .limit(1)
    .all();

  return users[0] ?? null;
}

export function sessionCookie(token: string, expiresAt: Date): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor((expiresAt.getTime() - Date.now()) / 1000)}`,
    `Expires=${expiresAt.toUTCString()}`,
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function clearSessionCookie(): string {
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export { hashToken };
