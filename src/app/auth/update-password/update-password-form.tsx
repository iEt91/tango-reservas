"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/auth-browser";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage("La contraseña debe tener al menos ocho caracteres.");
      return;
    }

    if (password !== confirmation) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage(
        "Falta configurar NEXT_PUBLIC_SUPABASE_URL y la clave pública.",
      );
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message || "No fue posible actualizar la contraseña.");
      setIsSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/auth/login?reset=success");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {message ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
        >
          {message}
        </div>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-200">
          Nueva contraseña
        </span>
        <input
          className="input-base"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-200">
          Repetir contraseña
        </span>
        <input
          className="input-base"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
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
          <KeyRound size={18} />
        )}
        {isSubmitting ? "Actualizando..." : "Guardar contraseña"}
      </button>
    </form>
  );
}
