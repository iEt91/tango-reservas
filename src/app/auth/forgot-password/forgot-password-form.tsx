"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Mail } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/auth-browser";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsError(false);

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage(
        "Falta configurar NEXT_PUBLIC_SUPABASE_URL y la clave pública.",
      );
      setIsError(true);
      return;
    }

    setIsSubmitting(true);

    const redirectTo =
      `${window.location.origin}/auth/callback`
      + `?next=${encodeURIComponent("/auth/update-password")}`;

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo },
    );

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message || "No fue posible enviar el enlace.");
      setIsError(true);
      return;
    }

    setMessage(
      "Si la cuenta existe, recibirás un correo con los próximos pasos.",
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {message ? (
        <div
          role="status"
          className={
            isError
              ? "rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
              : "rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
          }
        >
          {message}
        </div>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-200">
          Correo electrónico
        </span>
        <input
          className="input-base"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nombre@restaurante.com"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <LoaderCircle className="animate-spin" size={18} />
        ) : (
          <Mail size={18} />
        )}
        {isSubmitting ? "Enviando..." : "Enviar enlace"}
      </button>
    </form>
  );
}
