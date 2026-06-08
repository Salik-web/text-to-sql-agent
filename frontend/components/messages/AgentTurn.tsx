import type { AgentMsg } from "@/lib/types";
import { SqlBlock } from "@/components/SqlBlock";
import { ResultTable } from "@/components/ResultTable";
import { StatusLine } from "@/components/StatusLine";

export function AgentTurn({ msg }: { msg: AgentMsg }) {
  return (
    <div className="flex animate-rise flex-col gap-3">
      {msg.sql && <SqlBlock sql={msg.sql} />}

      {msg.result && !msg.rejected && <ResultTable result={msg.result} />}

      {msg.rejected && (
        <div className="rounded-card border border-danger/25 bg-danger/5 px-4 py-3">
          <div className="text-sm font-medium text-danger">
            Blocked for safety
          </div>
          <div className="mt-0.5 text-sm text-muted">{msg.rejected}</div>
        </div>
      )}

      {msg.gaveUp && (
        <div className="rounded-card border border-warn/25 bg-warn/5 px-4 py-3">
          <div className="text-sm font-medium text-warn">
            Couldn&apos;t get this one after 3 tries
          </div>
          <div className="mt-0.5 font-mono text-xs text-muted">
            {msg.gaveUp}
          </div>
          <div className="mt-1.5 text-sm text-muted">Try rephrasing.</div>
        </div>
      )}

      {msg.running && msg.status && <StatusLine text={msg.status} />}
    </div>
  );
}
