import type {
  ConnectResponse,
  ConnectError,
  ConversationSummary,
  ConversationDetail,
} from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export async function postConnect(
  connectionString: string,
): Promise<ConnectResponse | ConnectError> {
  try {
    const res = await fetch(`${API_BASE}/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connection_string: connectionString }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { error: data?.error ?? `Connection failed (${res.status})` };
    }
    if (data?.error) return { error: data.error };
    return data as ConnectResponse;
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown error";
    return { error: `Could not reach server: ${reason}` };
  }
}

export async function postConnectFile(
  file: File,
): Promise<ConnectResponse | ConnectError> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE}/connect-file`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: data?.error ?? `Upload failed (${res.status})` };
    if (data?.error) return { error: data.error };
    return data as ConnectResponse;
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown error";
    return { error: `Could not reach server: ${reason}` };
  }
}

export async function listConversations(): Promise<ConversationSummary[]> {
  try {
    const res = await fetch(`${API_BASE}/conversations`);
    if (!res.ok) return [];
    return (await res.json()) as ConversationSummary[];
  } catch {
    return [];
  }
}

export async function getConversation(
  id: string,
): Promise<ConversationDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/conversations/${id}`);
    if (!res.ok) return null;
    return (await res.json()) as ConversationDetail;
  } catch {
    return null;
  }
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/conversations/${id}`, { method: "DELETE" });
  } catch {
    return;
  }
}

export const STATUS_TEXT: Record<string, string> = {
  generate_sql: "Generating SQL…",
  validate_safety: "Checking safety…",
  execute: "Running query…",
  handle_error: "Fixing an error…",
  format_results: "Formatting results…",
};

export function deriveLabel(connectionString: string): string {
  try {
    const noQuery = connectionString.split("?")[0];
    const tail = noQuery.split("/").filter(Boolean).pop() ?? "";
    return tail || "database";
  } catch {
    return "database";
  }
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
