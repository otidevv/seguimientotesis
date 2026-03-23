"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Animation =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "zoom-in"
  | "zoom-out"
  | "flip-up"
  | "blur-in";

interface ScrollRevealProps {
  children: ReactNode;
  animation?: Animation;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  threshold?: number;
}

const animationStyles: Record<Animation, { from: string; to: string }> = {
  "fade-up": {
    from: "opacity-0 translate-y-10",
    to: "opacity-100 translate-y-0",
  },
  "fade-down": {
    from: "opacity-0 -translate-y-10",
    to: "opacity-100 translate-y-0",
  },
  "fade-left": {
    from: "opacity-0 translate-x-10",
    to: "opacity-100 translate-x-0",
  },
  "fade-right": {
    from: "opacity-0 -translate-x-10",
    to: "opacity-100 translate-x-0",
  },
  "zoom-in": {
    from: "opacity-0 scale-90",
    to: "opacity-100 scale-100",
  },
  "zoom-out": {
    from: "opacity-0 scale-110",
    to: "opacity-100 scale-100",
  },
  "flip-up": {
    from: "opacity-0 [transform:perspective(600px)_rotateX(15deg)_translateY(20px)]",
    to: "opacity-100 [transform:perspective(600px)_rotateX(0deg)_translateY(0)]",
  },
  "blur-in": {
    from: "opacity-0 blur-sm scale-95",
    to: "opacity-100 blur-0 scale-100",
  },
};

export function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  duration = 700,
  className = "",
  once = true,
  threshold = 0.15,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(element);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, threshold]);

  const { from, to } = animationStyles[animation];

  return (
    <div
      ref={ref}
      className={`transition-all ease-out ${isVisible ? to : from} ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Wraps multiple children and staggers their reveal */
interface StaggerRevealProps {
  children: ReactNode[];
  animation?: Animation;
  stagger?: number;
  duration?: number;
  className?: string;
  childClassName?: string;
  threshold?: number;
}

export function StaggerReveal({
  children,
  animation = "fade-up",
  stagger = 100,
  duration = 600,
  className = "",
  childClassName = "",
  threshold = 0.1,
}: StaggerRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  const { from, to } = animationStyles[animation];

  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <div
          key={i}
          className={`transition-all ease-out ${isVisible ? to : from} ${childClassName}`}
          style={{
            transitionDuration: `${duration}ms`,
            transitionDelay: `${i * stagger}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
