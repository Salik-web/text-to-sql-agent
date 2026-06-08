"use client";

import { useEffect, useRef } from "react";

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  disabled,
  streaming,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  disabled: boolean;
  streaming: boolean;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="sticky bottom-0 z-10 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-5 pt-3">
      <div className="mx-auto flex max-w-thread items-end gap-2 rounded-card border border-line bg-surface p-2 shadow-[0_2px_12px_-8px_rgba(27,26,23,0.2)] focus-within:border-accent/50">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed"
        />

        {streaming ? (
          <button
            onClick={onStop}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card bg-ink/90 text-white transition-opacity hover:opacity-90"
            title="Stop"
          >
            <span className="h-2.5 w-2.5 rounded-[2px] bg-white" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={disabled || !value.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card bg-accent text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
            title="Send"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 13V3M8 3L4 7M8 3l4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
