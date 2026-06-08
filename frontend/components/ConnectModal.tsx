"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "string" | "file";

export function ConnectModal({
  open,
  onClose,
  onConnect,
  onConnectFile,
}: {
  open: boolean;
  onClose: () => void;
  onConnect: (connectionString: string) => Promise<string | null>;
  onConnectFile: (file: File) => Promise<string | null>;
}) {
  const [mode, setMode] = useState<Mode>("string");
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setConnecting(false);
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !connecting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, connecting, onClose]);

  if (!open) return null;

  const submit = async () => {
    if (connecting) return;
    setConnecting(true);
    setError(null);

    let err: string | null = null;
    if (mode === "string") {
      const cs = value.trim();
      if (!cs) {
        setConnecting(false);
        return;
      }
      err = await onConnect(cs);
    } else {
      if (!file) {
        setConnecting(false);
        return;
      }
      err = await onConnectFile(file);
    }

    if (err) {
      setError(err);
      setConnecting(false);
    }
  };

  const tab = (m: Mode, label: string) => (
    <button
      onClick={() => {
        setMode(m);
        setError(null);
      }}
      disabled={connecting}
      className={`rounded-card px-3 py-1.5 text-sm transition-colors ${
        mode === m
          ? "bg-accent-soft text-accent"
          : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  const canSubmit = mode === "string" ? !!value.trim() : !!file;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 animate-fade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !connecting) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-card border border-line bg-surface p-6 shadow-[0_12px_40px_-12px_rgba(27,26,23,0.25)] animate-modalIn">
        <h2 className="text-base font-semibold text-ink">Connect database</h2>
        <p className="mt-1 text-sm text-muted">
          Read-only — the agent can only run SELECTs.
        </p>

        <div className="mt-4 flex gap-1 rounded-card border border-line p-1">
          {tab("string", "Connection string")}
          {tab("file", "Upload SQLite file")}
        </div>

        {mode === "string" ? (
          <>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              disabled={connecting}
              spellCheck={false}
              autoComplete="off"
              placeholder="postgresql://user:pass@host:5432/db"
              className="mt-4 w-full rounded-card border border-line bg-bg px-3 py-2.5 font-mono text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-accent disabled:opacity-60"
            />
            <p className="mt-2 text-xs text-muted">
              Supported: SQLite, PostgreSQL, MySQL (via SQLAlchemy).
            </p>
          </>
        ) : (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={connecting}
              className="mt-4 flex w-full flex-col items-center justify-center gap-1 rounded-card border border-dashed border-line bg-bg px-3 py-6 text-sm transition-colors hover:border-accent/50 disabled:opacity-60"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-muted">
                <path
                  d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5M4 14v1.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V14"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-mono text-ink">
                {file ? file.name : "Choose a .db / .sqlite file"}
              </span>
              {!file && (
                <span className="text-xs text-muted">or click to browse</span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".db,.sqlite,.sqlite3"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
            />
            <p className="mt-2 text-xs text-muted">
              SQLite only. The whole database lives in this one file.
            </p>
          </>
        )}

        {error && (
          <p className="mt-3 rounded-card bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={connecting}
            className="rounded-card px-3 py-2 text-sm text-muted transition-colors hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={connecting || !canSubmit}
            className="flex items-center gap-2 rounded-card bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {connecting && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-white/40 border-t-white" />
            )}
            {connecting
              ? mode === "file"
                ? "Uploading…"
                : "Inspecting schema…"
              : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
