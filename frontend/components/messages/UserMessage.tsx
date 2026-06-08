export function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end animate-rise">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-card bg-accent-soft px-3.5 py-2 text-sm text-ink">
        {text}
      </div>
    </div>
  );
}
