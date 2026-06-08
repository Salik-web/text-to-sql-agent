"use client";

import { useState } from "react";

const KEYWORDS =
  /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|AS|AND|OR|NOT|IN|IS|NULL|COUNT|SUM|AVG|MIN|MAX|DISTINCT|DESC|ASC|WITH|UNION|CASE|WHEN|THEN|ELSE|END|BETWEEN|LIKE)\b/gi;

function highlight(sql: string) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  KEYWORDS.lastIndex = 0;
  while ((m = KEYWORDS.exec(sql)) !== null) {
    if (m.index > last) parts.push(sql.slice(last, m.index));
    parts.push(
      <span key={m.index} className="font-medium text-accent">
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < sql.length) parts.push(sql.slice(last));
  return parts;
}

export function SqlBlock({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const oneLine = sql.replace(/\s+/g, " ").trim();

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className={`transition-transform ${open ? "rotate-90" : ""}`}
          >
            <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          sql
        </button>
        <button
          onClick={copy}
          className="text-xs text-muted transition-colors hover:text-ink"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>

      <div className="px-3 py-2 font-mono text-[13px] leading-relaxed text-ink">
        {open ? (
          <pre className="whitespace-pre-wrap break-words">{highlight(sql)}</pre>
        ) : (
          <div className="truncate text-muted">{oneLine}</div>
        )}
      </div>
    </div>
  );
}
