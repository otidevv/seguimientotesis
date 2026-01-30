import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { FirmaPeruScripts } from "@/components/firma-peru";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Seguimiento de Tesis - UNAMAD",
  description: "Sistema de seguimiento de tesis universitarias de la Universidad Nacional Amazónica de Madre de Dios",
  icons: {
    icon: "/logo/logounamad.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* jQuery 3.6.0 requerido por Firma Perú - DEBE cargarse primero */}
        <script
          src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"
          defer={false}
        />
        {/* Inicializar jqFirmaPeru INMEDIATAMENTE después de jQuery */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function initJqFirmaPeru() {
                  if (typeof jQuery !== 'undefined') {
                    var jqFirmaPeru = jQuery.noConflict(true);
                    window.jqFirmaPeru = jqFirmaPeru;
                    console.log('[Firma Perú] jqFirmaPeru inicializado correctamente');
                  } else {
                    setTimeout(initJqFirmaPeru, 50);
                  }
                }
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', initJqFirmaPeru);
                } else {
                  initJqFirmaPeru();
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Contenedor requerido por Firma Perú para ClickOnce - NO ELIMINAR */}
        <div id="addComponent" style={{ display: 'none' }} />

        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        {/* Scripts adicionales de Firma Perú (PCM) */}
        <FirmaPeruScripts />
      </body>
    </html>
  );
}
