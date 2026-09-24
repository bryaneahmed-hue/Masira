const MAX_BODY_BYTES = 256 * 1024;
const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARS = 20_000;

export type ValidatedChatBody = {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  conversationId?: number;
};

export async function readJsonBody(
  request: Request
): Promise<unknown> {
  const contentLength = request.headers.get("content-length");

  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    throw new Error("Request body is too large.");
  }

  const body = await request.text();

  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    throw new Error("Request body is too large.");
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Invalid JSON request body.");
  }
}

export function validateChatBody(
  body: unknown
): ValidatedChatBody {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const candidate = body as Record<string, unknown>;

  if (!Array.isArray(candidate.messages)) {
    throw new Error("Messages are required.");
  }

  if (candidate.messages.length > MAX_MESSAGES) {
    throw new Error("Too many messages.");
  }

  const messages = candidate.messages.map((message) => {
    if (!message || typeof message !== "object") {
      throw new Error("Invalid message.");
    }

    const item = message as Record<string, unknown>;

    if (item.role !== "user" && item.role !== "assistant") {
      throw new Error("Invalid message role.");
    }

    if (typeof item.content !== "string") {
      throw new Error("Message content must be text.");
    }

    if (item.content.length > MAX_MESSAGE_CHARS) {
      throw new Error("Message is too long.");
    }

    return {
      role: item.role as "user" | "assistant",
      content: item.content,
    };
  });

  let conversationId: number | undefined;

  if (candidate.conversationId !== undefined) {
    if (
      typeof candidate.conversationId !== "number" ||
      !Number.isInteger(candidate.conversationId) ||
      candidate.conversationId <= 0
    ) {
      throw new Error("Invalid conversation ID.");
    }

    conversationId = candidate.conversationId;
  }

  return {
    messages,
    conversationId,
  };
}
