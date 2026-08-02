import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      description="Enviaremos un enlace seguro al correo asociado con la cuenta."
      footer={
        <Link
          href="/auth/login"
          className="font-semibold text-emerald-300 hover:text-emerald-200"
        >
          Volver al ingreso
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
