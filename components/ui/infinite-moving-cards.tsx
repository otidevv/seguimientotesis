"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";

interface InfiniteMovingCardsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
}

export function InfiniteMovingCards({
  children,
  direction = "left",
  speed = "normal",
  pauseOnHover = true,
  className = "",
  ...rest
}: InfiniteMovingCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!scrollerRef.current || !containerRef.current) return;

    // WSG 2.5 — Skip infinite scroll if user prefers reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scroller = scrollerRef.current;

    // Duplicate children for infinite loop
    const items = Array.from(scroller.children);
    items.forEach((item) => {
      const clone = item.cloneNode(true) as HTMLElement;
      clone.setAttribute("aria-hidden", "true");
      scroller.appendChild(clone);
    });

    const duration =
      speed === "fast" ? "20s" : speed === "normal" ? "35s" : "50s";

    containerRef.current.style.setProperty("--animation-duration", duration);
    containerRef.current.style.setProperty(
      "--animation-direction",
      direction === "left" ? "forwards" : "reverse"
    );
    setReady(true);
  }, [direction, speed]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)] ${className}`}
      {...rest}
    >
      <div
        ref={scrollerRef}
        className={`flex gap-6 w-max ${
          ready
            ? "animate-[scroll_var(--animation-duration)_linear_infinite_var(--animation-direction)]"
            : ""
        } ${pauseOnHover ? "hover:[animation-play-state:paused]" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
