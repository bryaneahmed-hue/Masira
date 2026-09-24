import crypto from "node:crypto";
import { db } from "@/prisma/db";
import { createRandomToken, getOwnerEmail, hashToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

const TOKEN_MINUTES = 15;

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  if (!rateLimit(`magic-link:${ip}`, 5, 15 * 60 * 1000)) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const ownerEmail = getOwnerEmail();

    await writeAuditLog({
      event: "sign_in_requested",
      metadata: {
        email,
        ip,
      },
    });

    if (!email || email !== ownerEmail) {
      await writeAuditLog({
        event: "sign_in_failed",
        metadata: {
          reason: "unauthorized_email",
          ip,
        },
      });

      return Response.json({
        ok: true,
        message: "If the address is authorized, a sign-in link has been sent.",
      });
    }

    const existingUsers = await db.orm.public.User
      .select("id", "email", "name")
      .where({ email: ownerEmail })
      .limit(1)
      .all();

    const user =
      existingUsers[0] ??
      (await db.orm.public.User.create({
        email: ownerEmail,
        name: "Bryan",
      }));

    const rawToken = createRandomToken();
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date(
      Date.now() + TOKEN_MINUTES * 60 * 1000
    );

    await db.orm.public.MagicLinkToken.create({
      tokenHash,
      email: ownerEmail,
      userId: user.id,
      expiresAt: expiresAt.toISOString(),
    });

    const appUrl = process.env.APP_URL?.trim();

    if (!appUrl) {
      throw new Error("APP_URL is not configured.");
    }

    const loginUrl =
      `${appUrl.replace(/\/$/, "")}/api/auth/verify?token=` +
      encodeURIComponent(rawToken);

    const resendApiKey = process.env.RESEND_API_KEY;
    const from = process.env.AUTH_EMAIL_FROM;

    if (!resendApiKey || !from) {
      throw new Error("Email authentication is not configured.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [ownerEmail],
        subject: "Your Masira sign-in link",
        text: [
          "Sign in to Masira using the secure link below:",
          "",
          loginUrl,
          "",
          `This link expires in ${TOKEN_MINUTES} minutes and can only be used once.`,
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      console.error(
        "Resend email error:",
        response.status,
        await response.text()
      );

      throw new Error("Unable to send authentication email.");
    }

    return Response.json({
      ok: true,
      message: "If the address is authorized, a sign-in link has been sent.",
    });
  } catch (error) {
    console.error("Magic-link request error:", error);

    return Response.json(
      { error: "Unable to process the sign-in request." },
      { status: 500 }
    );
  }
}
