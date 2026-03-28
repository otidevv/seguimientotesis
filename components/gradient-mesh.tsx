"use client";

interface GradientMeshProps {
  className?: string;
  variant?: "hero" | "cta" | "soft";
}

const presets = {
  hero: [
    { x: "10%", y: "15%", size: "40%", opacity: 0.08, delay: "0s", dur: "8s" },
    { x: "70%", y: "25%", size: "45%", opacity: 0.06, delay: "1.2s", dur: "10s" },
    { x: "40%", y: "75%", size: "50%", opacity: 0.05, delay: "2.4s", dur: "12s" },
    { x: "85%", y: "65%", size: "35%", opacity: 0.07, delay: "3.6s", dur: "9s" },
  ],
  cta: [
    { x: "15%", y: "20%", size: "50%", opacity: 0.08, delay: "0s", dur: "10s" },
    { x: "75%", y: "30%", size: "40%", opacity: 0.06, delay: "1.5s", dur: "8s" },
    { x: "50%", y: "80%", size: "45%", opacity: 0.05, delay: "3s", dur: "11s" },
  ],
  soft: [
    { x: "20%", y: "30%", size: "40%", opacity: 0.04, delay: "0s", dur: "9s" },
    { x: "65%", y: "55%", size: "35%", opacity: 0.03, delay: "2s", dur: "11s" },
  ],
};

export function GradientMesh({ className = "", variant = "hero" }: GradientMeshProps) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {presets[variant].map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-3xl animate-[mesh-float_var(--dur)_ease-in-out_var(--delay)_infinite_alternate] motion-reduce:animate-none"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            backgroundColor: `oklch(from var(--primary) l c h / ${orb.opacity})`,
            "--dur": orb.dur,
            "--delay": orb.delay,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
