export function SystemMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-center animate-fade">
      <span className="text-xs text-muted">{text}</span>
    </div>
  );
}
