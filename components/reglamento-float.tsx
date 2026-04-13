"use client";

import { useState, useRef, useEffect } from "react";
import { X, ExternalLink } from "lucide-react";

function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
      <path d="M8 7h6" />
      <path d="M8 11h4" />
    </svg>
  );
}

const REGLAMENTO_URL =
  "https://www.gob.pe/institucion/unamad/informes-publicaciones/3962682-reglamento-general-de-grados-y-titulos-de-la-unamad";

export function ReglamentoFloat() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3 pointer-events-none">
      {/* Tooltip / Card desplegable */}
      <div
        className={`
          bg-card border rounded-2xl shadow-2xl overflow-hidden w-[min(320px,calc(100vw-3rem))]
          motion-safe:transition-all motion-safe:duration-300 origin-bottom-left
          ${open ? "scale-100 opacity-100 translate-y-0 pointer-events-auto" : "scale-90 opacity-0 translate-y-4 pointer-events-none"}
        `}
      >
        {/* Header */}
        <div className="bg-primary px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookIcon className="w-5 h-5 text-primary-foreground" />
            <div>
              <p className="text-primary-foreground text-sm font-semibold">Normativa UNAMAD</p>
              <p className="text-primary-foreground/70 text-[11px]">Documentos oficiales</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-primary-foreground/70 hover:text-primary-foreground transition-colors p-1 rounded-full hover:bg-primary-foreground/10"
            aria-label="Cerrar panel de normativa"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4">
          <a
            href={REGLAMENTO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted transition-colors group focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <BookIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">Reglamento General de Grados y Títulos</p>
              <p className="text-[11px] text-muted-foreground mt-1">Consulta los requisitos y procedimientos para obtener tu grado académico o título profesional.</p>
              <span className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-2 group-hover:underline">
                Ver en gob.pe
                <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </a>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t">
          <p className="text-[10px] text-muted-foreground text-center">
            Fuente: Plataforma Digital del Estado Peruano
          </p>
        </div>
      </div>

      {/* Botón flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          group relative w-14 h-14 rounded-full shadow-lg
          bg-primary hover:bg-primary/90 text-primary-foreground
          flex items-center justify-center pointer-events-auto cursor-pointer
          motion-safe:transition-all motion-safe:duration-300 hover:scale-110 hover:shadow-xl
          focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          ${open ? "rotate-90" : ""}
        `}
        aria-label="Ver Reglamento de Grados y Títulos"
      >
        {!open && (
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 motion-reduce:animate-none" />
        )}
        <BookIcon className={`w-7 h-7 relative z-10 transition-transform duration-300 ${open ? "scale-0" : "scale-100"}`} />
        <X className={`w-6 h-6 absolute z-10 transition-transform duration-300 ${open ? "scale-100 -rotate-90" : "scale-0"}`} />
      </button>
    </div>
  );
}
