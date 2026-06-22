import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { AppChrome } from "@/components/AppChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Base tecnica de Tango Reservas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
