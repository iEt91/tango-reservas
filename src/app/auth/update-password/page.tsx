import { AuthCard } from "@/components/auth/auth-card";
import { UpdatePasswordForm } from "./update-password-form";

export default function UpdatePasswordPage() {
  return (
    <AuthCard
      title="Definir nueva contraseña"
      description="La nueva contraseña debe tener al menos ocho caracteres."
    >
      <UpdatePasswordForm />
    </AuthCard>
  );
}
