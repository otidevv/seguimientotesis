"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface GradientMeshProps {
  className?: string;
  variant?: "hero" | "cta" | "soft";
}

const presets = {
  hero: [
    { x: "10%", y: "15%", size: "40%", color: "var(--primary)", opacity: 0.08 },
    { x: "70%", y: "25%", size: "45%", color: "var(--primary)", opacity: 0.06 },
    { x: "40%", y: "75%", size: "50%", color: "var(--primary)", opacity: 0.05 },
    { x: "85%", y: "65%", size: "35%", color: "var(--primary)", opacity: 0.07 },
  ],
  cta: [
    { x: "15%", y: "20%", size: "50%", color: "var(--primary-foreground)", opacity: 0.08 },
    { x: "75%", y: "30%", size: "40%", color: "var(--primary-foreground)", opacity: 0.06 },
    { x: "50%", y: "80%", size: "45%", color: "var(--primary-foreground)", opacity: 0.05 },
  ],
  soft: [
    { x: "20%", y: "30%", size: "40%", color: "var(--primary)", opacity: 0.04 },
    { x: "65%", y: "55%", size: "35%", color: "var(--primary)", opacity: 0.03 },
  ],
};

export function GradientMesh({ className = "", variant = "hero" }: GradientMeshProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // WSG 2.5 — Skip animations if user prefers reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const orbs = el.querySelectorAll<HTMLDivElement>("[data-orb]");
    const ctx = gsap.context(() => {
      orbs.forEach((orb, i) => {
        gsap.to(orb, {
          x: () => gsap.utils.random(-40, 40),
          y: () => gsap.utils.random(-30, 30),
          scale: () => gsap.utils.random(0.85, 1.2),
          duration: () => gsap.utils.random(6, 12),
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: i * 1.2,
        });
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {presets[variant].map((orb, i) => (
        <div
          key={i}
          data-orb
          className="absolute rounded-full blur-3xl will-change-transform"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            backgroundColor: `oklch(from ${orb.color} l c h / ${orb.opacity})`,
          }}
        />
      ))}
    </div>
  );
}
