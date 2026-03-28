import type { Metadata } from "next";
import { Geist, Geist_Mono, Syne } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { FirmaPeruScripts } from "@/components/firma-peru";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} antialiased`}
      >
        {/* WSG 3.1 — Skip-to-content link for keyboard/screen-reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
        >
          Saltar al contenido principal
        </a>

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
            <WhatsAppFloat />
          </AuthProvider>
        </ThemeProvider>
        {/* jQuery 3.6.0 — carga diferida, solo necesario para Firma Perú */}
        <Script
          src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"
          strategy="lazyOnload"
          id="jquery-firma-peru"
        />
        <Script id="jquery-init-firma-peru" strategy="lazyOnload">{`
          (function check(){
            if(typeof jQuery!=='undefined'){
              var jq=jQuery.noConflict(true);window.jqFirmaPeru=jq;
            } else { setTimeout(check,100); }
          })();
        `}</Script>
        {/* Scripts adicionales de Firma Perú (PCM) */}
        <FirmaPeruScripts />
      </body>
    </html>
  );
}
