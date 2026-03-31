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
  const [activeSection, setActiveSection] = useState("#top");
  const lastScrollY = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setHidden(currentY > 100 && currentY > lastScrollY.current);
      setScrolled(currentY > 20);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );

    const ids = ["top", "caracteristicas", "proceso", "faq", "contacto"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-500 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-6 flex items-center justify-between h-[80px]">
        {/* Logo */}
        <a href="#top" className="flex items-center gap-3 group shrink-0 relative z-10">
          <Image
            src="/logo/logounamad.png"
            alt="UNAMAD Logo"
            width={44}
            height={44}
            className="rounded-xl ring-1 ring-border/50 group-hover:ring-primary/40 transition-all duration-300 group-hover:shadow-md group-hover:shadow-primary/10"
          />
          <div className="hidden sm:flex flex-col">
            <span className="font-[family-name:var(--font-syne)] text-[15px] font-bold leading-tight tracking-tight">
              Seguimiento de Tesis
            </span>
            <span className="text-[10px] font-semibold text-primary/70 tracking-[0.18em] uppercase">
              UNAMAD
            </span>
          </div>
        </a>

        {/* ════════════════════════════════════════════ */}
        {/* FLOATING PILL NAV — Cardaq-style             */}
        {/* ════════════════════════════════════════════ */}
        <div className="hidden lg:flex items-center">
          <nav
            className={`flex items-center gap-0.5 rounded-full border-2 px-2 py-1.5 transition-all duration-500 ${
              scrolled
                ? "bg-background/95 backdrop-blur-xl border-border shadow-lg shadow-black/[0.08]"
                : "bg-background/80 backdrop-blur-md border-border/70 shadow-md shadow-black/[0.05]"
            }`}
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative text-[13px] font-medium px-4 py-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Divider inside pill */}
            <div className="w-px h-5 bg-border/50 mx-1" />

            {/* CTA inside pill */}
            <Button asChild size="sm" className="text-[13px] font-medium gap-1.5 rounded-full px-5 h-9 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300 group">
              <Link href="/registrarse">
                Registrarse
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </Button>
          </nav>
        </div>

        {/* Right actions */}
        <div className="hidden lg:flex items-center gap-3 relative z-10">
          <ModeToggle />
          <Button asChild variant="ghost" size="sm" className="text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors">
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
        </div>

        {/* Mobile */}
        <div className="flex lg:hidden items-center gap-2">
          <ModeToggle />
          {mounted && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] p-0">
                <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 p-6 border-b">
                    <Image
                      src="/logo/logounamad.png"
                      alt="UNAMAD Logo"
                      width={36}
                      height={36}
                      className="rounded-xl"
                    />
                    <div>
                      <p className="font-[family-name:var(--font-syne)] font-bold text-sm leading-tight">Seguimiento de Tesis</p>
                      <p className="text-[10px] text-primary/70 font-semibold tracking-[0.15em] uppercase">UNAMAD</p>
                    </div>
                  </div>

                  <nav className="flex flex-col p-4 gap-1 flex-1">
                    {navItems.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200 group"
                      >
                        <span>{item.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all duration-200" />
                      </a>
                    ))}
                  </nav>

                  <div className="p-5 border-t space-y-3">
                    <Button asChild variant="outline" className="w-full h-11 rounded-xl">
                      <Link href="/login" onClick={() => setOpen(false)}>Iniciar Sesión</Link>
                    </Button>
                    <Button asChild className="w-full h-11 rounded-xl gap-2 group">
                      <Link href="/registrarse" onClick={() => setOpen(false)}>
                        Registrarse
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
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
