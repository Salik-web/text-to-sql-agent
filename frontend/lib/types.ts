export interface ConnectResponse {
  session_id: string;
  dialect: string;
  label: string;
  schema_summary: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  label: string | null;
  dialect: string | null;
  created_at: number;
}

export interface StoredMessage {
  role: "user" | "agent";
  text?: string;
  sql?: string | null;
  result?: ResultPayload | null;
  rejected?: string | null;
  gaveUp?: string | null;
}

export interface ConversationDetail {
  id: string;
  title: string;
  dialect: string | null;
  label: string | null;
  messages: StoredMessage[];
}

export interface ConnectError {
  error: string;
}

export interface ResultPayload {
  columns: string[];
  rows: unknown[][];
}

export interface UserMsg {
  id: string;
  role: "user";
  text: string;
}

export interface SystemMsg {
  id: string;
  role: "system";
  text: string;
}

export interface AgentMsg {
  id: string;
  role: "agent";
  running: boolean;
  status: string | null;
  sql: string | null;
  result: ResultPayload | null;
  rejected: string | null;
  gaveUp: string | null;
  lastError: string | null;
}

export type Message = UserMsg | SystemMsg | AgentMsg;

export interface Connection {
  dialect: string;
  label: string;
}
