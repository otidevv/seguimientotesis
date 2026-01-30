"use client";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface HeaderProps {
  variant?: "default" | "auth";
}

export function Header({ variant = "default" }: HeaderProps) {
  if (variant === "auth") {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-5 w-5" />
            <Image
              src="/logo/logounamad.png"
              alt="UNAMAD Logo"
              width={32}
              height={32}
              className="rounded"
            />
            <span className="font-bold hidden sm:inline">Seguimiento de Tesis</span>
          </Link>
          <ModeToggle />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo/logounamad.png"
            alt="UNAMAD Logo"
            width={40}
            height={40}
            className="rounded"
          />
          <span className="text-xl font-bold hidden sm:inline">Seguimiento de Tesis</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/#caracteristicas" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Características
          </Link>
          <Link href="/#proceso" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Proceso
          </Link>
          <Link href="/#testimonios" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Testimonios
          </Link>
          <Link href="/#faq" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            FAQ
          </Link>
          <Link href="/#contacto" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Contacto
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Link href="/login">
            <Button variant="ghost">Iniciar Sesión</Button>
          </Link>
          <Link href="/registrarse">
            <Button>Registrarse</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
