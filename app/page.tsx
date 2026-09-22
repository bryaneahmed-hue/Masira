"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversationLoading, setConversationLoading] = useState(true);
  const [conversationError, setConversationError] = useState(false);

  useEffect(() => {
    async function createNewConversation() {
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
  }, []);

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

          <div className="flex items-center gap-2 text-sm text-green-600">
            <span className="h-2 w-2 rounded-full bg-green-500" />

            {conversationError
              ? "Offline"
              : conversationLoading
                ? "Starting..."
                : "Online"}
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
}
