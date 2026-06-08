"use client";

const EXAMPLES = [
  "Which customer spent the most?",
  "Show total revenue by month",
  "List the 5 newest orders",
];

export function EmptyState({
  connected,
  onConnect,
  onPickExample,
}: {
  connected: boolean;
  onConnect: () => void;
  onPickExample: (q: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center animate-fade">
      <h1 className="text-lg font-semibold tracking-tight text-ink">
        Ask your database anything
      </h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted">
        Connect a database, then ask questions in plain English. The agent
        writes and runs read-only SQL for you.
      </p>

      {!connected ? (
        <button
          onClick={onConnect}
          className="mt-5 rounded-card bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Connect database
        </button>
      ) : (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {EXAMPLES.map((q) => (
            <button
              key={q}
              onClick={() => onPickExample(q)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-ink"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
