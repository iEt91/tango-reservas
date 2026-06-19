type WhatsAppButtonProps = {
  phone: string;
  message: string;
  className?: string;
  children?: React.ReactNode;
};

export function WhatsAppButton({
  phone,
  message,
  className = "",
  children = "Enviar WhatsApp",
}: WhatsAppButtonProps) {
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 hover:text-white ${className}`}
    >
      {children}
    </a>
  );
}
