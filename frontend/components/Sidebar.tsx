"use client";

import type { ConversationSummary } from "@/lib/types";

export function Sidebar({
  conversations,
  currentId,
  onNew,
  onSelect,
  onDelete,
}: {
  conversations: ConversationSummary[];
  currentId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-line bg-bg">
      <div className="px-3 py-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-card border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-accent/40"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 2.5v9M2.5 7h9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted">
            No conversations yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversations.map((c) => {
              const active = c.id === currentId;
              return (
                <li key={c.id} className="group relative">
                  <button
                    onClick={() => onSelect(c.id)}
                    className={`flex w-full flex-col items-start gap-0.5 rounded-card px-2.5 py-2 text-left transition-colors ${
                      active ? "bg-accent-soft" : "hover:bg-surface"
                    }`}
                  >
                    <span className="line-clamp-1 w-full pr-5 text-sm text-ink">
                      {c.title}
                    </span>
                    {c.dialect && (
                      <span className="font-mono text-[11px] text-muted">
                        {c.dialect}
                        {c.label ? ` · ${c.label}` : ""}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                    }}
                    title="Delete conversation"
                    className="absolute right-1.5 top-2 rounded p-1 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M3 3l8 8M11 3l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
