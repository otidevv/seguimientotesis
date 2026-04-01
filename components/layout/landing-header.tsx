"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ModeToggle } from "@/components/mode-toggle";
import { Menu, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const navItems = [
  { href: "#top", label: "Inicio" },
  { href: "#caracteristicas", label: "Características" },
  { href: "#proceso", label: "Proceso" },
  { href: "#faq", label: "FAQ" },
  { href: "#contacto", label: "Contacto" },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setHidden(currentY > 80 && currentY > lastScrollY.current);
      setScrolled(currentY > 20);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full motion-safe:transition-all motion-safe:duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${
        scrolled
          ? "bg-background/90 backdrop-blur-xl border-b shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <a href="#top" className="flex items-center gap-2.5 group">
          <Image
            src="/logo/logounamad.png"
            alt="UNAMAD Logo"
            width={38}
            height={38}
            className="rounded-xl ring-1 ring-border group-hover:ring-primary/50 transition-all duration-300"
          />
          <div className="hidden sm:flex flex-col">
            <span className="font-[family-name:var(--font-syne)] text-sm font-bold leading-tight tracking-tight">
              Seguimiento de Tesis
            </span>
            <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase">
              UNAMAD
            </span>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center">
          <div className="flex items-center bg-muted/50 rounded-full px-1 py-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors px-3.5 py-1.5 rounded-full hover:bg-background hover:shadow-sm"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Desktop buttons */}
        <div className="hidden lg:flex items-center gap-2">
          <ModeToggle />
          <Button asChild variant="ghost" size="sm" className="text-[13px] hover:bg-primary/5">
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
          <Button asChild size="sm" className="text-[13px] gap-1.5 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 group">
            <Link href="/registrarse">
              Registrarse
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Button>
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex lg:hidden items-center gap-1.5">
          <ModeToggle />
          {mounted && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0">
                <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-2.5 p-5 border-b">
                    <Image
                      src="/logo/logounamad.png"
                      alt="UNAMAD Logo"
                      width={32}
                      height={32}
                      className="rounded-lg"
                    />
                    <div>
                      <p className="font-bold text-sm leading-tight">Seguimiento de Tesis</p>
                      <p className="text-[10px] text-muted-foreground">UNAMAD</p>
                    </div>
                  </div>

                  <nav className="flex flex-col p-3 gap-0.5 flex-1">
                    {navItems.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      >
                        {item.label}
                      </a>
                    ))}
                  </nav>

                  <div className="p-4 border-t space-y-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/login" onClick={() => setOpen(false)}>Iniciar Sesión</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link href="/registrarse" onClick={() => setOpen(false)}>Registrarse</Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  );
}
