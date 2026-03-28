"use client";

import { useRef, useState, useCallback } from "react";

interface SpotlightProps {
  className?: string;
  fill?: string;
}

/**
 * Spotlight — CSS-only mouse-following radial gradient.
 * Replaced framer-motion with inline style for WSG 4.1 (efficient code).
 */
export function Spotlight({ className = "", fill = "white" }: SpotlightProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const gradientRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = divRef.current?.getBoundingClientRect();
      const el = gradientRef.current;
      if (!rect || !el) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.background = `radial-gradient(650px circle at ${x}px ${y}px, ${fill}10, transparent 80%)`;
    },
    [fill]
  );

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
      className={`absolute inset-0 z-0 ${className}`}
      aria-hidden="true"
    >
      <div
        ref={gradientRef}
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{ opacity: isFocused ? 1 : 0 }}
      />
    </div>
  );
}
