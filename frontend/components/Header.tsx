"use client";

import type { Connection } from "@/lib/types";

export function Header({
  connection,
  onPillClick,
}: {
  connection: Connection | null;
  onPillClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-end border-b border-line bg-bg/80 px-4 backdrop-blur">
      <button
        onClick={onPillClick}
        className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-ink"
        title={connection ? "Reconnect a database" : "Connect a database"}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            connection ? "bg-accent" : "bg-line"
          }`}
        />
        {connection ? (
          <span className="font-mono">
            {connection.dialect} · {connection.label}
          </span>
        ) : (
          <span>not connected</span>
        )}
      </button>
    </header>
  );
}
