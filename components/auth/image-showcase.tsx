"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { GraduationCap } from "lucide-react";

const images = [
  {
    src: "/images/imagenesunamad/Copia de DJI_0011-Pano.jpg",
    label: "Vista panorámica del campus",
  },
  {
    src: "/images/imagenesunamad/Copia de DSC09076-Edit.jpg",
    label: "Infraestructura universitaria",
  },
  {
    src: "/images/imagenesunamad/Copia de DSC09696 copia.jpg",
    label: "Espacios académicos",
  },
  {
    src: "/images/imagenesunamad/Copia de DSC09701 copia.jpg",
    label: "Campus UNAMAD",
  },
  {
    src: "/images/imagenesunamad/Copia de DSC09711 copia.jpg",
    label: "Áreas verdes",
  },
  {
    src: "/images/imagenesunamad/Copia de DSC09715 copia.jpg",
    label: "Vida universitaria",
  },
];

export function ImageShowcase() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Crossfading images */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={current}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          <Image
            src={images[current].src}
            alt={images[current].label}
            fill
            className="object-cover"
            sizes="50vw"
            priority={current === 0}
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col justify-between p-8 z-10">
        {/* Top: Logo & branding */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">UNAMAD</p>
            <p className="text-white/60 text-xs">Universidad Nacional Amazónica de Madre de Dios</p>
          </div>
        </motion.div>

        {/* Bottom: Caption & indicators */}
        <div>
          <AnimatePresence mode="wait">
            <motion.p
              key={current}
              className="text-white/90 text-lg font-medium mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              {images[current].label}
            </motion.p>
          </AnimatePresence>

          {/* Progress indicators */}
          <div className="flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="relative h-1 rounded-full overflow-hidden cursor-pointer flex-1 max-w-12 bg-white/20"
              >
                {i === current && (
                  <motion.div
                    className="absolute inset-0 bg-white rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 5, ease: "linear" }}
                    style={{ transformOrigin: "left" }}
                  />
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

/** Mobile version: just a background with stronger gradient */
export function ImageShowcaseMobile() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 -z-10">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={current}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        >
          <Image
            src={images[current].src}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority={current === 0}
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
    </div>
  );
}
