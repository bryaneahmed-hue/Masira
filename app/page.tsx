"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";

type AuthUser = {
  id: number;
  email: string;
  name: string | null;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversationLoading, setConversationLoading] = useState(true);
  const [conversationError, setConversationError] = useState(false);

  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInSent, setSignInSent] = useState(false);
  const [signInError, setSignInError] = useState("");

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = await response.json();

        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Session check error:", error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    }

    checkSession();
  }, []);

  useEffect(() => {
    if (!user) {
      setConversationLoading(false);
      return;
    }

    async function createNewConversation() {
      setConversationLoading(true);
      setConversationError(false);

      try {
        const response = await fetch("/api/conversations", {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Failed to create conversation");
        }

        const data = await response.json();

        setConversationId(data.id);
      } catch (error) {
        console.error("Conversation creation error:", error);
        setConversationError(true);
      } finally {
        setConversationLoading(false);
      }
    }

    createNewConversation();
  }, [user]);

  const { messages, sendMessage, status } = useChat({
    id: conversationId ? `conversation-${conversationId}` : "new",
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: conversationId
        ? {
            conversationId,
          }
        : undefined,
    }),
  });

  const isLoading =
    status === "submitted" ||
    status === "streaming" ||
    conversationLoading;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || signInLoading) {
      return;
    }

    setSignInLoading(true);
    setSignInError("");
    setSignInSent(false);

    try {
      const response = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to request sign-in link");
      }

      setSignInSent(true);
    } catch (error) {
      console.error("Sign-in request error:", error);
      setSignInError(
        "Unable to send the sign-in link. Please try again."
      );
    } finally {
      setSignInLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      setUser(null);
      setConversationId(null);
      setConversationError(false);
      setConversationLoading(false);
      setSignInSent(false);
      setEmail("");
    }
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Masira</h1>
          <p className="mt-2 text-sm text-gray-500">
            Checking your session...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900">
              Masira
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Your personal AI assistant
            </p>
          </div>

          <form onSubmit={handleSignIn} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={signInLoading}
                className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:border-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={signInLoading || !email.trim()}
              className="w-full rounded-xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
            >
              {signInLoading ? "Sending..." : "Send sign-in link"}
            </button>
          </form>

          {signInSent && (
            <div className="mt-5 rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-700">
              If that email is authorised, a sign-in link has been sent.
              Check your inbox.
            </div>
          )}

          {signInError && (
            <div className="mt-5 rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
              {signInError}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Masira
            </h1>

            <p className="text-sm text-gray-500">
              Your personal AI assistant • English & Arabic
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user.name || user.email}
              </p>

              <p className="text-xs text-gray-500">{user.email}</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Log out
            </button>

            <div className="flex items-center gap-2 text-sm text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500" />

              {conversationError
                ? "Offline"
                : conversationLoading
                  ? "Starting..."
                  : "Online"}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.length === 0 && !conversationError && (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-800">
                  How can I help you today?
                </h2>

                <p className="mt-2 text-gray-500">
                  Ask me something in English or Arabic.
                </p>
              </div>
            </div>
          )}

          {conversationError && (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-600">
                  Unable to start the conversation
                </h2>

                <p className="mt-2 text-gray-500">
                  Please refresh the page and try again.
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-black text-white"
                    : "bg-white text-gray-900 shadow-sm"
                }`}
              >
                {message.parts.map((part, index) =>
                  part.type === "text" ? (
                    <p key={index} className="whitespace-pre-wrap">
                      {part.text}
                    </p>
                  ) : null
                )}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="flex gap-2 rounded-2xl border bg-white p-2 shadow-sm">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                conversationLoading
                  ? "Starting conversation..."
                  : "Ask me anything..."
              }
              className="flex-1 bg-transparent px-3 py-3 outline-none"
              disabled={isLoading || conversationError}
            />

            <button
              type="submit"
              disabled={
                isLoading ||
                conversationError ||
                !conversationId ||
                !input.trim()
              }
              className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
            >
              {isLoading ? "Thinking..." : "Send"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!input.trim() || isLoading || !conversationId) {
      return;
    }

    const message = input.trim();

    setInput("");

    await sendMessage({
      text: message,
    });
  }
}
