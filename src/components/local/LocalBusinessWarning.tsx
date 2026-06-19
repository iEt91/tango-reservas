type LocalBusinessWarningProps = {
  message: string;
};

export function LocalBusinessWarning({ message }: LocalBusinessWarningProps) {
  if (!message) {
    return null;
  }

  return (
    <section className="rounded-[1.2rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-50 shadow-2xl shadow-black/20">
      {message}
    </section>
  );
}
