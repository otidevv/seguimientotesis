"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ModeToggle } from "@/components/mode-toggle";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const navItems = [
  { href: "#top", label: "Inicio" },
  { href: "#caracteristicas", label: "Características" },
  { href: "#proceso", label: "Proceso" },
  { href: "#testimonios", label: "Testimonios" },
  { href: "#faq", label: "FAQ" },
  { href: "#contacto", label: "Contacto" },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      // Hide when scrolling down past 80px, show when scrolling up
      setHidden(currentY > 80 && currentY > lastScrollY.current);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/50 overflow-hidden transition-transform duration-300 ${hidden ? "-translate-y-full" : "translate-y-0"}`}>
      {/* Gradient shimmer line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-[shimmer_3s_ease-in-out_infinite] pointer-events-none" />

      <div className="container mx-auto flex h-16 items-center justify-between px-4 relative z-10">
        {/* Logo */}
        <a href="#top" className="flex items-center gap-2 cursor-pointer group">
          <div className="relative">
            <Image
              src="/logo/logounamad.png"
              alt="UNAMAD Logo"
              width={40}
              height={40}
              className="rounded group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 rounded bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md" />
          </div>
          <span className="text-xl font-bold hidden sm:inline bg-gradient-to-r from-foreground to-foreground bg-clip-text group-hover:from-primary group-hover:to-primary/70 group-hover:text-transparent transition-all duration-300">
            Seguimiento de Tesis
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-md hover:bg-primary/5 group"
            >
              {item.label}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary rounded-full group-hover:w-2/3 transition-all duration-300" />
            </Link>
          ))}
        </nav>

        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-2">
          <ModeToggle />
          <Link href="/login">
            <Button variant="ghost" className="hover:bg-primary/10">Iniciar Sesión</Button>
          </Link>
          <Link href="/registrarse">
            <Button className="shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-shadow duration-300">Registrarse</Button>
          </Link>
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <ModeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              <div className="flex flex-col h-full">
                {/* Mobile menu header */}
                <div className="flex items-center gap-2 p-4 border-b">
                  <Image
                    src="/logo/logounamad.png"
                    alt="UNAMAD Logo"
                    width={32}
                    height={32}
                    className="rounded"
                  />
                  <span className="font-bold text-sm">Seguimiento de Tesis</span>
                </div>

                {/* Mobile nav links */}
                <nav className="flex flex-col p-4 gap-1 flex-1">
                  {navItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>

                {/* Mobile action buttons */}
                <div className="p-4 border-t flex flex-col gap-2">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">Iniciar Sesión</Button>
                  </Link>
                  <Link href="/registrarse" onClick={() => setOpen(false)}>
                    <Button className="w-full">Registrarse</Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
