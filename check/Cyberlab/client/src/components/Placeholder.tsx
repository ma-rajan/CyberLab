interface PlaceholderProps {
  title: string;
  message: string;
}

export function Placeholder({ title, message }: PlaceholderProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-panel p-10">
      <p className="font-mono text-sm text-cyber">// PHASE 1</p>
      <h1 className="mt-3 text-4xl font-bold text-white">{title}</h1>
      <p className="mt-4 text-slate-300">{message}</p>
    </section>
  );
}
