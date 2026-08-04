import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Riego App — INSSAL",
  description: "Seguimiento y control de proyectos de riego",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Este script corre ANTES de que el navegador pinte
            cualquier cosa en pantalla — así, si el modo oscuro está
            guardado, se aplica de inmediato, sin pasar primero por
            blanco. Sin esto, el modo oscuro recién se aplicaba
            cuando React terminaba de cargar, causando el destello. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var modo = localStorage.getItem('riego-app-theme');
                if (modo === 'dark') {
                  document.documentElement.setAttribute('data-mode', 'dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
