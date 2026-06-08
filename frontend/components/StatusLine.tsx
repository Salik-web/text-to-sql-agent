export function StatusLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted animate-fade">
      <span className="flex items-center gap-1 text-accent">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </span>
      <span>{text}</span>
    </div>
  );
}
