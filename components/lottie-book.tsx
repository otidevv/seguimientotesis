"use client";

import { useRef, useState, useEffect } from "react";
import { DotLottie } from "@lottiefiles/dotlottie-web";

/**
 * Custom DotLottie wrapper — bypasses DotLottieReact's double-load bug
 * (useEffect calls loadAnimation() while constructor is still loading).
 * Uses DotLottie directly + IntersectionObserver for WSG 2.1 lazy loading.
 */
function LazyLottie({ src, className }: { src: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lottieRef = useRef<DotLottie | null>(null);
  const [visible, setVisible] = useState(false);

  // WSG 2.1 — Only load when element enters viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Initialize DotLottie once visible + canvas mounted
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!visible || !canvas) return;

    // Wait one frame so the browser resolves layout and the canvas
    // has real computed dimensions for the WASM rendering buffer.
    const raf = requestAnimationFrame(() => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.round(rect.width * window.devicePixelRatio);
        canvas.height = Math.round(rect.height * window.devicePixelRatio);
      }

      const instance = new DotLottie({
        canvas,
        src,
        loop: true,
        autoplay: true,
        renderConfig: { freezeOnOffscreen: true, autoResize: true },
      });
      lottieRef.current = instance;
    });

    return () => {
      cancelAnimationFrame(raf);
      lottieRef.current?.destroy();
      lottieRef.current = null;
    };
  }, [visible, src]);

  return (
    <div ref={containerRef} className={className} aria-hidden="true">
      {visible && (
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}

export function LottieBook({ className }: { className?: string }) {
  return (
    <LazyLottie
      src="/lottie/book.lottie"
      className={className}
    />
  );
}

export function LottieCta({ className }: { className?: string }) {
  return (
    <LazyLottie
      src="/lottie/cta.lottie"
      className={className}
    />
  );
}
