import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    reset?: string;
    error?: string;
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);
  const initialMessage =
    params.reset === "success"
      ? "La contraseña fue actualizada. Iniciá sesión nuevamente."
      : params.error === "access_changed"
        ? "Tu acceso o tus permisos cambiaron. Iniciá sesión nuevamente para continuar."
        : params.error === "config"
          ? "Falta configurar la URL o la clave pública de Supabase."
          : null;

  return (
    <AuthCard
      title="Ingresar al panel"
      description="Usá la cuenta asociada a los locales donde tenés acceso."
      footer={
        <>
          ¿Olvidaste la contraseña?{" "}
          <Link
            href="/auth/forgot-password"
            className="font-semibold text-emerald-300 hover:text-emerald-200"
          >
            Recuperarla
          </Link>
        </>
      }
    >
      <LoginForm
        nextPath={nextPath}
        initialMessage={initialMessage}
      />
    </AuthCard>
  );
}
