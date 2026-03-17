"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import Image from "next/image";

interface HeroPhotoProps {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
  /** Shape variant */
  variant?: "circle" | "rounded" | "wide";
  /** Stagger delay for entrance animation (seconds) */
  delay?: number;
  /** Direction to slide in from */
  slideFrom?: "top" | "right" | "bottom" | "left";
}

const slideVariants = {
  top: { y: -40, x: 0 },
  right: { x: 40, y: 0 },
  bottom: { y: 40, x: 0 },
  left: { x: -40, y: 0 },
};

export function HeroPhoto({
  src,
  alt = "",
  className = "",
  sizes = "100px",
  variant = "rounded",
  delay = 0,
  slideFrom = "top",
}: HeroPhotoProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Mouse position relative to center (-0.5 to 0.5)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring config for smooth, natural movement
  const springConfig = { stiffness: 300, damping: 20, mass: 0.5 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), springConfig);
  const scale = useSpring(1, springConfig);

  // Glare position
  const glareX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), springConfig);
  const glareY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), springConfig);
  const glareOpacity = useSpring(0, springConfig);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  }

  function handleMouseEnter() {
    scale.set(1.25);
    glareOpacity.set(0.15);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
    scale.set(1);
    glareOpacity.set(0);
  }

  const initial = { opacity: 0, scale: 0.8, ...slideVariants[slideFrom] };

  return (
    <motion.div
      ref={ref}
      className={`overflow-hidden shadow-lg cursor-pointer ${className}`}
      style={{
        rotateX,
        rotateY,
        scale,
        transformPerspective: 600,
        transformStyle: "preserve-3d",
      }}
      initial={initial}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay: 0.5 + delay,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{
        zIndex: 30,
        boxShadow: "0 20px 40px rgba(0,0,0,0.15), 0 0 20px rgba(var(--primary-rgb, 220,38,38), 0.15)",
      }}
    >
      <div className="relative w-full h-full">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes={sizes}
        />
        {/* Gradient overlay */}
        {variant === "wide" && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        )}
        {/* Dynamic glare */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: glareOpacity,
            background: useTransform(
              [glareX, glareY],
              ([x, y]) =>
                `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.8) 0%, transparent 60%)`
            ),
          }}
        />
      </div>
    </motion.div>
  );
}
