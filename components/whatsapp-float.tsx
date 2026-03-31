"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const facultades = [
  {
    nombre: "Fac. de Ingeniería",
    codigo: "FI",
    telefono: "51982876444",
    mensaje: "Hola, soy tesista de la Facultad de Ingeniería. Quisiera consultar sobre mi trámite de tesis.",
  },
  {
    nombre: "Fac. de Educación",
    codigo: "FE",
    telefono: "51986092382",
    mensaje: "Hola, soy tesista de la Facultad de Educación. Quisiera consultar sobre mi trámite de tesis.",
  },
  {
    nombre: "Fac. de Ciencias Empresariales",
    codigo: "FCE",
    telefono: "51975845277",
    mensaje: "Hola, soy tesista de la Facultad de Ciencias Empresariales. Quisiera consultar sobre mi trámite de tesis.",
  },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className}>
      <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958A15.9 15.9 0 0 0 16.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.34 22.606c-.39 1.1-1.932 2.014-3.18 2.28-.852.18-1.964.324-5.708-1.226-4.794-1.986-7.876-6.856-8.114-7.174-.228-.318-1.924-2.558-1.924-4.878s1.218-3.462 1.65-3.934c.432-.472.944-.59 1.258-.59.314 0 .63.002.904.016.29.014.68-.11 1.064.812.39.944 1.336 3.264 1.454 3.5.118.236.196.512.038.826-.158.318-.236.514-.472.79-.236.278-.496.62-.708.832-.236.236-.482.492-.208.964.276.472 1.224 2.018 2.63 3.268 1.808 1.608 3.332 2.106 3.804 2.342.472.236.748.196 1.022-.118.276-.314 1.18-1.376 1.494-1.848.314-.472.63-.39 1.062-.236.432.158 2.748 1.296 3.22 1.532.472.236.786.354.904.55.118.196.118 1.14-.272 2.24z" />
    </svg>
  );
}

export function WhatsAppFloat() {
  const pathname = usePathname();
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

  if (pathname !== "/") return null;

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {/* Menu desplegable */}
      <div
        className={`
          bg-card border rounded-2xl shadow-2xl overflow-hidden w-[min(300px,calc(100vw-3rem))]
          transition-all duration-300 origin-bottom-right
          ${open ? "scale-100 opacity-100 translate-y-0 pointer-events-auto" : "scale-90 opacity-0 translate-y-4 pointer-events-none"}
        `}
      >
        {/* Header */}
        <div className="bg-[#075E54] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WhatsAppIcon className="w-5 h-5 text-white" />
            <div>
              <p className="text-white text-sm font-semibold">Mesa de Partes</p>
              <p className="text-white/70 text-[11px]">Selecciona tu facultad</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            aria-label="Cerrar menú de contacto"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Lista de facultades */}
        <div className="p-2">
          {facultades.map((fac) => (
            <a
              key={fac.codigo}
              href={`https://wa.me/${fac.telefono}?text=${encodeURIComponent(fac.mensaje)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors group"
              onClick={() => setOpen(false)}
            >
              <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0 group-hover:bg-[#25D366]/20 transition-colors">
                <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{fac.nombre}</p>
                <p className="text-[11px] text-muted-foreground">Mesa de Partes</p>
              </div>
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t">
          <p className="text-[10px] text-muted-foreground text-center">
            Horario de atención: Lun - Vie, 8:00 - 16:00
          </p>
        </div>
      </div>

      {/* Botón flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          pointer-events-auto group relative w-14 h-14 rounded-full shadow-lg
          bg-[#25D366] hover:bg-[#20BD5A] text-white
          flex items-center justify-center
          transition-all duration-300 hover:scale-110 hover:shadow-xl
          ${open ? "rotate-90" : ""}
        `}
        aria-label="Contactar Mesa de Partes por WhatsApp"
      >
        {/* Ping animation */}
        {!open && (
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25 motion-reduce:animate-none" />
        )}
        <WhatsAppIcon className={`w-7 h-7 relative z-10 transition-transform duration-300 ${open ? "scale-0" : "scale-100"}`} />
        <X className={`w-6 h-6 absolute z-10 transition-transform duration-300 ${open ? "scale-100 -rotate-90" : "scale-0"}`} />
      </button>
    </div>
  );
}
