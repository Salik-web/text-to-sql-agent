import { useCallback, useRef, useState } from "react";
import { API_BASE } from "@/lib/api";

export interface StreamHandlers {
  onStatus?: (node: string) => void;
  onSql?: (sql: string) => void;
  onResult?: (columns: string[], rows: unknown[][]) => void;
  onRejected?: (reason: string) => void;
  onError?: (attempt: number, message: string) => void;
  onDone?: (status: "success" | "gave_up") => void;
  onStreamError?: (message: string) => void;
}

interface ParsedEvent {
  event: string;
  data: string;
}

function parseBlock(raw: string): ParsedEvent | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

function dispatch(block: ParsedEvent, h: StreamHandlers) {
  let payload: any = {};
  try {
    payload = block.data ? JSON.parse(block.data) : {};
  } catch {
    return;
  }
  switch (block.event) {
    case "status":
      h.onStatus?.(payload.node);
      break;
    case "sql":
      h.onSql?.(payload.sql);
      break;
    case "result":
      h.onResult?.(payload.columns ?? [], payload.rows ?? []);
      break;
    case "rejected":
      h.onRejected?.(payload.reason ?? "Query was blocked.");
      break;
    case "error":
      h.onError?.(payload.attempt ?? 1, payload.message ?? "Query failed.");
      break;
    case "done":
      h.onDone?.(payload.status === "gave_up" ? "gave_up" : "success");
      break;
    default:
      break;
  }
}

export function useQueryStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const startQuery = useCallback(
    async (sessionId: string, question: string, handlers: StreamHandlers) => {
      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${API_BASE}/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ session_id: sessionId, question }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          handlers.onStreamError?.(`Request failed (${res.status})`);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let reading = true;

        while (reading) {
          const { done, value } = await reader.read();
          if (done) {
            reading = false;
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          buffer = buffer.replace(/\r\n/g, "\n");

          let sep: number;
          while ((sep = buffer.indexOf("\n\n")) !== -1) {
            const raw = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const block = parseBlock(raw);
            if (block) dispatch(block, handlers);
          }
        }

        const tail = parseBlock(buffer);
        if (tail) dispatch(tail, handlers);
      } catch (e) {
        if (!controller.signal.aborted) {
          const reason = e instanceof Error ? e.message : "stream error";
          handlers.onStreamError?.(reason);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { isStreaming, startQuery, stop };
}
