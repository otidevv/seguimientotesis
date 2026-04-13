"use client";

import { Effigy } from "@opeepsfun/open-peeps";
import { useRef, useEffect, type ReactNode } from "react";

/* ── Scroll-reveal wrapper (CSS + IntersectionObserver, no framer-motion) ── */
function ScrollReveal({
  children,
  className,
  direction = "up",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  direction?: "up" | "left" | "right" | "down";
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transitionDelay = `${delay}s`;
          el.classList.add("scroll-revealed");
          observer.disconnect();
        }
      },
      { rootMargin: "-80px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  const dirClass = {
    up: "scroll-reveal-up",
    down: "scroll-reveal-down",
    left: "scroll-reveal-left",
    right: "scroll-reveal-right",
  }[direction];

  return (
    <div ref={ref} className={`scroll-reveal ${dirClass} ${className ?? ""}`}>
      {children}
    </div>
  );
}

/* ── Skin & outline palette ── */
const SKIN = "#F0D5BB";
const SKIN_DARK = "#C68642";
const SKIN_MED = "#D4A76A";
const OUTLINE = "#2D2D2D";

/* ── Hero Scene: University + Graduated Peeps ── */

function GraduadoPeep({
  bodyType,
  headType,
  faceType,
  skinColor,
  topColor,
  beardType,
  accessoryType,
  style,
}: {
  bodyType: string;
  headType: string;
  faceType: string;
  skinColor: string;
  topColor: string;
  beardType?: string;
  accessoryType?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Effigy
      body={{ type: bodyType, options: { skinColor, topColor, outlineColor: OUTLINE } }}
      head={{ type: headType, options: { skinColor, outlineColor: OUTLINE } }}
      face={{ type: faceType, options: { outlineColor: OUTLINE } }}
      {...(beardType ? { beard: { type: beardType, options: { outlineColor: OUTLINE } } } : {})}
      {...(accessoryType ? { accessory: { type: accessoryType, options: { outlineColor: OUTLINE } } } : {})}
      style={style}
    />
  );
}

export function HeroGraduados({ className }: { className?: string }) {
  const peeps = [
    { bodyType: "Tee", headType: "LongBangs", faceType: "Smile", skinColor: SKIN, topColor: "#1E3A5F", delay: 0.6 },
    { bodyType: "BlazerBlackTee", headType: "ShortFour", faceType: "Calm", skinColor: SKIN_MED, topColor: "#1E3A5F", beardType: "Goatee", delay: 0.75 },
    { bodyType: "Paper", headType: "ShortOne", faceType: "BigSmile", skinColor: SKIN_MED, topColor: "#1E3A5F", accessoryType: "Glasses", delay: 0.9 },
    { bodyType: "Explaining", headType: "Bun", faceType: "LoveGrinTeeth", skinColor: SKIN_DARK, topColor: "#1E3A5F", delay: 1.05 },
    { bodyType: "Tee", headType: "MediumBangs", faceType: "Cheeky", skinColor: SKIN, topColor: "#1E3A5F", accessoryType: "GlassesTwo", delay: 1.2 },
    { bodyType: "ButtonShirt", headType: "Afro", faceType: "SmileTeeth", skinColor: SKIN_DARK, topColor: "#1E3A5F", delay: 1.35 },
    { bodyType: "Hoodie", headType: "LongCurly", faceType: "Cute", skinColor: SKIN, topColor: "#1E3A5F", delay: 1.5 },
    { bodyType: "Tee", headType: "MediumStraight", faceType: "Driven", skinColor: SKIN_MED, topColor: "#1E3A5F", accessoryType: "Glasses", delay: 1.65 },
  ];

  return (
    <div className={className}>
      <div className="w-full h-full flex items-end justify-center gap-40">
        {peeps.map((p, i) => (
          <div
            key={i}
            className="peep-fade-in"
            style={{ animationDelay: `${p.delay}s` }}
          >
            <div style={{ width: 34, height: 46, overflow: "visible", position: "relative" }}>
              <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%) scale(0.11)", transformOrigin: "bottom center", width: 300 }}>
                <GraduadoPeep
                  bodyType={p.bodyType}
                  headType={p.headType}
                  faceType={p.faceType}
                  skinColor={p.skinColor}
                  topColor={p.topColor}
                  beardType={p.beardType}
                  accessoryType={p.accessoryType}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Testimonial Characters ── */

/** María Castillo - Estudiante Ing. Sistemas */
export function PeepMaria({ className }: { className?: string }) {
  return (
    <ScrollReveal className={className} direction="up" delay={0.1}>
      <Effigy
        body={{
          type: "Explaining",
          options: { skinColor: SKIN, topColor: "#6366F1", outlineColor: OUTLINE },
        }}
        head={{
          type: "LongBangs",
          options: { skinColor: SKIN, outlineColor: OUTLINE },
        }}
        face={{
          type: "Smile",
          options: { outlineColor: OUTLINE },
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </ScrollReveal>
  );
}

/** Dr. Juan Ríos - Asesor */
export function PeepJuan({ className }: { className?: string }) {
  return (
    <ScrollReveal className={className} direction="up" delay={0.2}>
      <Effigy
        body={{
          type: "ButtonShirt",
          options: { skinColor: SKIN_MED, topColor: "#1E40AF", outlineColor: OUTLINE },
        }}
        head={{
          type: "ShortOne",
          options: { skinColor: SKIN_MED, outlineColor: OUTLINE },
        }}
        face={{
          type: "Calm",
          options: { outlineColor: OUTLINE },
        }}
        beard={{
          type: "Goatee",
          options: { outlineColor: OUTLINE },
        }}
        accessory={{
          type: "Glasses",
          options: { outlineColor: OUTLINE },
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </ScrollReveal>
  );
}

/** Luis Paredes - Estudiante Administración */
export function PeepLuis({ className }: { className?: string }) {
  return (
    <ScrollReveal className={className} direction="up" delay={0.3}>
      <Effigy
        body={{
          type: "Tee",
          options: { skinColor: SKIN_DARK, topColor: "#059669", outlineColor: OUTLINE },
        }}
        head={{
          type: "MediumOne",
          options: { skinColor: SKIN_DARK, outlineColor: OUTLINE },
        }}
        face={{
          type: "BigSmile",
          options: { outlineColor: OUTLINE },
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </ScrollReveal>
  );
}

/* ── Section Accent Characters ── */

/** Features section - Character explaining/pointing */
export function PeepExplaining({ className }: { className?: string }) {
  return (
    <ScrollReveal className={className} direction="right" delay={0.3}>
      <Effigy
        body={{
          type: "PointingUp",
          options: { skinColor: SKIN, topColor: "#8B5CF6", outlineColor: OUTLINE },
        }}
        head={{
          type: "Bun",
          options: { skinColor: SKIN, outlineColor: OUTLINE },
        }}
        face={{
          type: "Cheeky",
          options: { outlineColor: OUTLINE },
        }}
        accessory={{
          type: "GlassesTwo",
          options: { outlineColor: OUTLINE },
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </ScrollReveal>
  );
}

/** FAQ section - Thoughtful girl character */
export function PeepThinking({ className }: { className?: string }) {
  return (
    <ScrollReveal className={className} direction="left" delay={0.2}>
      <Effigy
        body={{
          type: "Coffee",
          options: { skinColor: SKIN, topColor: "#F59E0B", outlineColor: OUTLINE },
        }}
        head={{
          type: "LongBangs",
          options: { skinColor: SKIN, outlineColor: OUTLINE },
        }}
        face={{
          type: "Cute",
          options: { outlineColor: OUTLINE },
        }}
        accessory={{
          type: "GlassesTwo",
          options: { outlineColor: OUTLINE },
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </ScrollReveal>
  );
}

/* ── Process Step Characters ── */

/** Step 1 - Student registering */
export function PeepRegistro({ className }: { className?: string }) {
  return (
    <ScrollReveal className={className} direction="up" delay={0.1}>
      <Effigy
        body={{
          type: "Paper",
          options: { skinColor: SKIN, topColor: "#3B82F6", outlineColor: OUTLINE },
        }}
        head={{
          type: "MediumBangs",
          options: { skinColor: SKIN, outlineColor: OUTLINE },
        }}
        face={{
          type: "Driven",
          options: { outlineColor: OUTLINE },
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </ScrollReveal>
  );
}

/** Step 2 - Advisor assigned */
export function PeepAsesor({ className }: { className?: string }) {
  return (
    <ScrollReveal className={className} direction="up" delay={0.2}>
      <Effigy
        body={{
          type: "BlazerBlackTee",
          options: { skinColor: SKIN_MED, topColor: "#0D9488", outlineColor: OUTLINE },
        }}
        head={{
          type: "ShortFour",
          options: { skinColor: SKIN_MED, outlineColor: OUTLINE },
        }}
        face={{
          type: "Smile",
          options: { outlineColor: OUTLINE },
        }}
        beard={{
          type: "MustacheThin",
          options: { outlineColor: OUTLINE },
        }}
        accessory={{
          type: "Glasses",
          options: { outlineColor: OUTLINE },
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </ScrollReveal>
  );
}

/** Step 3 - Researching */
export function PeepInvestigador({ className }: { className?: string }) {
  return (
    <ScrollReveal className={className} direction="up" delay={0.3}>
      <Effigy
        body={{
          type: "Computer",
          options: { skinColor: SKIN_DARK, topColor: "#7C3AED", outlineColor: OUTLINE },
        }}
        head={{
          type: "Twists",
          options: { skinColor: SKIN_DARK, outlineColor: OUTLINE },
        }}
        face={{
          type: "Explaining",
          options: { outlineColor: OUTLINE },
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </ScrollReveal>
  );
}

/** Step 4 - Graduation */
export function PeepGraduado({ className }: { className?: string }) {
  return (
    <ScrollReveal className={className} direction="up" delay={0.4}>
      <Effigy
        body={{
          type: "Tee",
          options: { skinColor: SKIN, topColor: "#DC2626", outlineColor: OUTLINE },
        }}
        head={{
          type: "LongHair",
          options: { skinColor: SKIN, outlineColor: OUTLINE },
        }}
        face={{
          type: "SmileTeeth",
          options: { outlineColor: OUTLINE },
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </ScrollReveal>
  );
}
