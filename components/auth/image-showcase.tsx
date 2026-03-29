"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { GraduationCap } from "lucide-react";

// WSG 2.1/2.2: Imágenes optimizadas WebP (~300KB vs ~25MB originales = 98% reducción)
const images = [
  {
    src: "/images/imagenesunamad/optimized/DSC09076-Edit.webp",
    label: "Infraestructura universitaria",
  },
  {
    src: "/images/imagenesunamad/optimized/DSC09696_copia.webp",
    label: "Espacios académicos",
  },
  {
    src: "/images/imagenesunamad/optimized/DSC09701_copia.webp",
    label: "Campus UNAMAD",
  },
  {
    src: "/images/imagenesunamad/optimized/DSC09711_copia.webp",
    label: "Áreas verdes",
  },
  {
    src: "/images/imagenesunamad/optimized/DSC09715_copia.webp",
    label: "Vida universitaria",
  },
];

export function ImageShowcase() {
  const [current, setCurrent] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  // WSG 3.7: Pausar carrusel cuando la pestaña no es visible (ahorro CPU/energía)
  useEffect(() => {
    if (prefersReducedMotion) return; // WSG 3.10: No auto-rotar si prefiere menos movimiento

    let interval: ReturnType<typeof setInterval>;

    const startInterval = () => {
      interval = setInterval(() => {
        setCurrent((prev) => (prev + 1) % images.length);
      }, 6000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        startInterval();
      }
    };

    startInterval();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [prefersReducedMotion]);

  // WSG 3.10: Variantes según preferencia de movimiento
  const imageVariants = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.3 } }
    : { initial: { opacity: 0, scale: 1.05 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0 }, transition: { duration: 1.2, ease: "easeInOut" as const } };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black" role="region" aria-label="Galería de imágenes del campus UNAMAD" aria-roledescription="carrusel">
      {/* Crossfading images — WSG 2.3: solo priority en la primera */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={current}
          className="absolute inset-0"
          initial={imageVariants.initial}
          animate={imageVariants.animate}
          exit={imageVariants.exit}
          transition={imageVariants.transition}
        >
          <Image
            src={images[current].src}
            alt={images[current].label}
            fill
            className="object-cover"
            sizes="50vw"
            priority={current === 0}
            loading={current === 0 ? "eager" : "lazy"}
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col justify-between p-8 z-10">
        {/* Top: Logo & branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">UNAMAD</p>
            <p className="text-white/60 text-xs">Universidad Nacional Amazónica de Madre de Dios</p>
          </div>
        </div>

        {/* Bottom: Caption & indicators */}
        <div>
          <p className="text-white/90 text-lg font-medium mb-4" aria-live="polite">
            {images[current].label}
          </p>

          {/* Progress indicators — WSG 4.1: aria-labels accesibles */}
          <div className="flex gap-2" role="tablist" aria-label="Indicadores de imagen">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                role="tab"
                aria-selected={i === current}
                aria-label={`Imagen ${i + 1}: ${img.label}`}
                className="relative h-1 rounded-full overflow-hidden cursor-pointer flex-1 max-w-12 bg-white/20 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              >
                {i === current && !prefersReducedMotion && (
                  <motion.div
                    className="absolute inset-0 bg-white rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 6, ease: "linear" }}
                    style={{ transformOrigin: "left" }}
                  />
                )}
                {i === current && prefersReducedMotion && (
                  <div className="absolute inset-0 bg-white rounded-full" />
                )}
                {i < current && (
                  <div className="absolute inset-0 bg-white/50 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** WSG: Mobile — single static image, no carousel (ahorro de datos y CPU en móvil) */
export function ImageShowcaseMobile() {
  return (
    <div className="fixed inset-0 -z-10" aria-hidden="true">
      <Image
        src={images[0].src}
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
        priority
      />
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
    </div>
  );
}
