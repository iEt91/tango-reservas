import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Baum Pinamar · Propuesta de Tango Reservas",
  description: "Vista previa de diseño para Baum Pinamar. No es el sitio oficial del establecimiento.",
  robots: { index: false, follow: false },
};

export default function PreviewLayout({ children }: { children: ReactNode }) { return children; }
