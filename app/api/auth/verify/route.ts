import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import {
  createSession,
  getOwnerEmail,
  hashToken,
  sessionCookie,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/?auth=invalid", request.url)
      );
    }

    const tokenHash = hashToken(token);

    const tokens = await db.orm.public.MagicLinkToken
      .select(
        "id",
        "email",
        "expiresAt",
        "usedAt",
        "userId"
      )
      .where({ tokenHash })
      .limit(1)
      .all();

    const magicLink = tokens[0];

    if (!magicLink) {
      return NextResponse.redirect(
        new URL("/?auth=invalid", request.url)
      );
    }

    const ownerEmail = getOwnerEmail();

    if (
      magicLink.email.trim().toLowerCase() !== ownerEmail
    ) {
      await writeAuditLog({
        event: "sign_in_failed",
        metadata: {
          reason: "email_mismatch",
        },
      });

      return NextResponse.redirect(
        new URL("/?auth=invalid", request.url)
      );
    }

    if (magicLink.usedAt) {
      return NextResponse.redirect(
        new URL("/?auth=used", request.url)
      );
    }

    if (
      new Date(magicLink.expiresAt).getTime() <= Date.now()
    ) {
      return NextResponse.redirect(
        new URL("/?auth=expired", request.url)
      );
    }

    let userId = magicLink.userId;

    if (!userId) {
      const users = await db.orm.public.User
        .select("id", "email", "name")
        .where({ email: ownerEmail })
        .limit(1)
        .all();

      const user = users[0];

      if (!user) {
        return NextResponse.redirect(
          new URL("/?auth=invalid", request.url)
        );
      }

      userId = user.id;
    }

    await db.orm.public.MagicLinkToken
      .where({ id: magicLink.id })
      .update({
        usedAt: new Date().toISOString(),
        userId,
      });

    const session = await createSession(userId);

    await writeAuditLog({
      userId,
      event: "sign_in_succeeded",
    });

    const appUrl = process.env.APP_URL?.trim();

    if (!appUrl) {
      throw new Error("APP_URL is not configured.");
    }

    const response = NextResponse.redirect(
      new URL("/", appUrl)
    );

    response.headers.append(
      "Set-Cookie",
      sessionCookie(session.token, session.expiresAt)
    );

    return response;
  } catch (error) {
    console.error("Magic-link verification error:", error);

    return NextResponse.redirect(
      new URL("/?auth=error", request.url)
    );
  }
}
