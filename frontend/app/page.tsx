"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentMsg,
  Connection,
  ConnectResponse,
  ConversationSummary,
  Message,
} from "@/lib/types";
import {
  postConnect,
  postConnectFile,
  deriveLabel,
  uid,
  STATUS_TEXT,
  listConversations,
  getConversation,
  deleteConversation,
} from "@/lib/api";
import { useQueryStream } from "@/hooks/useQueryStream";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { ConnectModal } from "@/components/ConnectModal";
import { Composer } from "@/components/Composer";
import { EmptyState } from "@/components/EmptyState";
import { UserMessage } from "@/components/messages/UserMessage";
import { SystemMessage } from "@/components/messages/SystemMessage";
import { AgentTurn } from "@/components/messages/AgentTurn";

export default function Page() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [input, setInput] = useState("");

  const { isStreaming, startQuery, stop } = useQueryStream();
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshConversations = useCallback(async () => {
    setConversations(await listConversations());
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const patchAgent = useCallback((id: string, p: Partial<AgentMsg>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id && m.role === "agent" ? { ...m, ...p } : m)),
    );
  }, []);

  const applyConnect = useCallback(
    (res: ConnectResponse, fallbackLabel: string) => {
      setSessionId(res.session_id);
      setConnection({
        dialect: res.dialect,
        label: res.label ?? fallbackLabel,
      });
      setModalOpen(false);
      setMessages([
        {
          id: uid(),
          role: "system",
          text: `Connected to ${res.dialect}. Ask a question.`,
        },
      ]);
      refreshConversations();
    },
    [refreshConversations],
  );

  const handleConnect = useCallback(
    async (cs: string): Promise<string | null> => {
      const res = await postConnect(cs);
      if ("error" in res) return res.error;
      applyConnect(res, deriveLabel(cs));
      return null;
    },
    [applyConnect],
  );

  const handleConnectFile = useCallback(
    async (f: File): Promise<string | null> => {
      const res = await postConnectFile(f);
      if ("error" in res) return res.error;
      applyConnect(res, f.name);
      return null;
    },
    [applyConnect],
  );

  const newChat = useCallback(() => {
    setSessionId(null);
    setConnection(null);
    setMessages([]);
    setModalOpen(true);
  }, []);

  const selectConversation = useCallback(
    async (id: string) => {
      if (id === sessionId) return;
      const detail = await getConversation(id);
      if (!detail) return;
      setSessionId(detail.id);
      setConnection({
        dialect: detail.dialect ?? "database",
        label: detail.label ?? "database",
      });
      setMessages(
        detail.messages.map((m) =>
          m.role === "user"
            ? { id: uid(), role: "user", text: m.text ?? "" }
            : {
                id: uid(),
                role: "agent",
                running: false,
                status: null,
                sql: m.sql ?? null,
                result: m.result ?? null,
                rejected: m.rejected ?? null,
                gaveUp: m.gaveUp ?? null,
                lastError: null,
              },
        ),
      );
    },
    [sessionId],
  );

  const removeConversation = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      await refreshConversations();
      if (id === sessionId) {
        setSessionId(null);
        setConnection(null);
        setMessages([]);
      }
    },
    [sessionId, refreshConversations],
  );

  const send = useCallback(() => {
    const q = input.trim();
    if (!q || !sessionId || isStreaming) return;
    setInput("");

    const agentId = uid();
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", text: q },
      {
        id: agentId,
        role: "agent",
        running: true,
        status: STATUS_TEXT.generate_sql,
        sql: null,
        result: null,
        rejected: null,
        gaveUp: null,
        lastError: null,
      },
    ]);

    startQuery(sessionId, q, {
      onStatus: (node) =>
        patchAgent(agentId, { status: STATUS_TEXT[node] ?? "Working…" }),
      onSql: (sql) => patchAgent(agentId, { sql }),
      onResult: (columns, rows) =>
        patchAgent(agentId, { result: { columns, rows } }),
      onRejected: (reason) =>
        patchAgent(agentId, { rejected: reason, running: false, status: null }),
      onError: (attempt, message) =>
        patchAgent(agentId, {
          status: `Fixing an error, retry ${attempt}/3…`,
          lastError: message,
        }),
      onDone: (status) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== agentId || m.role !== "agent") return m;
            if (status === "gave_up") {
              return {
                ...m,
                running: false,
                status: null,
                gaveUp: m.lastError ?? "Unknown error",
              };
            }
            return { ...m, running: false, status: null };
          }),
        );
        refreshConversations();
      },
      onStreamError: (msg) =>
        patchAgent(agentId, { running: false, status: null, gaveUp: msg }),
    });
  }, [input, sessionId, isStreaming, startQuery, patchAgent, refreshConversations]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen">
      <Sidebar
        conversations={conversations}
        currentId={sessionId}
        onNew={newChat}
        onSelect={selectConversation}
        onDelete={removeConversation}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header connection={connection} onPillClick={() => setModalOpen(true)} />

        <main className="flex flex-1 flex-col overflow-hidden">
          {!hasMessages ? (
            <EmptyState
              connected={!!sessionId}
              onConnect={() => setModalOpen(true)}
              onPickExample={(q) => setInput(q)}
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto flex max-w-thread flex-col gap-5 px-4 py-6">
                {messages.map((m) => {
                  if (m.role === "user")
                    return <UserMessage key={m.id} text={m.text} />;
                  if (m.role === "system")
                    return <SystemMessage key={m.id} text={m.text} />;
                  return <AgentTurn key={m.id} msg={m} />;
                })}
                <div ref={bottomRef} />
              </div>
            </div>
          )}

          <Composer
            value={input}
            onChange={setInput}
            onSend={send}
            onStop={stop}
            disabled={!sessionId || isStreaming}
            streaming={isStreaming}
            placeholder={
              sessionId ? "Ask a question…" : "Connect a database to start"
            }
          />
        </main>
      </div>

      <ConnectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnect={handleConnect}
        onConnectFile={handleConnectFile}
      />
    </div>
  );
}
