"use client";

import { useEffect, useState } from "react";

export function AnimatedCtaArrow() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`
        flex items-center gap-2 transition-all duration-1000 ease-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      {/* Animated curved arrow pointing up toward buttons */}
      <div className="relative cta-arrow-container">
        {/* Subtle pulsing glow */}
        <div className="absolute -inset-2 bg-primary/8 rounded-full blur-xl animate-pulse" />

        <svg
          width="100"
          height="50"
          viewBox="0 0 100 50"
          fill="none"
          className="relative z-10 text-primary"
        >
          {/* Curved hand-drawn style path */}
          <path
            d="M6 44 C 16 44, 28 40, 38 32 C 48 24, 58 14, 76 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            className="cta-arrow-path"
          />
          {/* Arrowhead */}
          <path
            d="M68 16 L 78 9 L 72 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="cta-arrow-head"
          />
          {/* Decorative dot at start */}
          <circle
            cx="6"
            cy="44"
            r="2.5"
            fill="currentColor"
            className="cta-arrow-dot"
          />
        </svg>
      </div>

      {/* Handwritten-style label */}
      <span
        className={`
          text-[13px] font-medium text-primary/70 italic tracking-wide
          transition-all duration-700 delay-1000
          ${visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"}
        `}
      >
        Comienza aqui
      </span>
    </div>
  );
}
