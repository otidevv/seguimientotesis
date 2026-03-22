export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="200" cy="200" r="180" className="fill-primary/10" />
      <circle cx="200" cy="200" r="150" className="fill-primary/5" />

      {/* Stack of books */}
      <rect x="100" y="220" width="100" height="22" rx="3" className="fill-primary/80" />
      <rect x="105" y="198" width="90" height="22" rx="3" className="fill-primary/60" />
      <rect x="110" y="176" width="80" height="22" rx="3" className="fill-primary/40" />

      {/* Document/Thesis */}
      <rect x="220" y="170" width="70" height="95" rx="4" className="fill-white dark:fill-gray-800" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
      <line x1="232" y1="190" x2="278" y2="190" className="stroke-primary/40" strokeWidth="3" strokeLinecap="round" />
      <line x1="232" y1="207" x2="278" y2="207" className="stroke-primary/30" strokeWidth="3" strokeLinecap="round" />
      <line x1="232" y1="224" x2="265" y2="224" className="stroke-primary/20" strokeWidth="3" strokeLinecap="round" />
      <line x1="232" y1="241" x2="272" y2="241" className="stroke-primary/20" strokeWidth="3" strokeLinecap="round" />

      {/* Graduation Cap */}
      <polygon points="200,60 110,105 200,150 290,105" className="fill-primary" />
      <rect x="191" y="105" width="18" height="50" className="fill-primary/80" />
      <polygon points="200,95 155,118 200,141 245,118" className="fill-primary/90" />
      <circle cx="200" cy="155" r="7" className="fill-primary" />
      <line x1="200" y1="155" x2="200" y2="180" className="stroke-primary" strokeWidth="3" />
      <path d="M200 180 Q210 188 206 205" className="stroke-primary" strokeWidth="3" fill="none" />
      <circle cx="206" cy="210" r="5" className="fill-primary" />

      {/* Decorative circles */}
      <circle cx="320" cy="100" r="12" className="fill-primary/20" />
      <circle cx="80" cy="130" r="8" className="fill-primary/15" />
      <circle cx="340" cy="180" r="6" className="fill-primary/25" />
      <circle cx="60" cy="240" r="10" className="fill-primary/10" />

      {/* Sparkles */}
      <path d="M350 70 L354 78 L362 75 L356 82 L360 90 L352 84 L345 90 L348 82 L340 78 L348 75 Z" className="fill-primary/40" />
      <path d="M55 90 L58 96 L64 94 L60 99 L63 105 L56 100 L50 105 L52 99 L46 94 L52 96 Z" className="fill-primary/30" />
    </svg>
  );
}

export function WaveDivider({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1440 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{ transform: flip ? 'scaleY(-1)' : undefined }}
    >
      <path
        d="M0 60C240 120 480 0 720 60C960 120 1200 0 1440 60V120H0V60Z"
        className="fill-muted/50"
      />
    </svg>
  );
}

export function BlobDecoration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="200" cy="200" r="200" className="fill-primary/5" />
    </svg>
  );
}

export function GridPattern({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="1.5" className="fill-primary/10" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

export function FloatingShapes({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="40" cy="40" r="20" className="fill-primary/10" />
      <circle cx="160" cy="50" r="15" className="fill-primary/15" />
      <circle cx="100" cy="150" r="25" className="fill-primary/8" />
      <rect x="150" y="130" width="30" height="30" rx="8" className="fill-primary/12" />
      <rect x="20" y="120" width="20" height="20" rx="5" className="fill-primary/10" />
    </svg>
  );
}

/* ── Process Step SVG Icons ── */

export function RegistroIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Clipboard */}
      <rect x="10" y="8" width="28" height="34" rx="3" className="stroke-current" strokeWidth="2" fill="none" />
      <rect x="16" y="4" width="16" height="8" rx="2" className="fill-current opacity-20 stroke-current" strokeWidth="1.5" />
      {/* Lines */}
      <line x1="16" y1="20" x2="32" y2="20" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="26" x2="28" y2="26" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="32" x2="30" y2="32" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
      {/* Pencil accent */}
      <path d="M34 34 L38 30 L42 34 L38 38 Z" className="fill-current opacity-30" />
      <line x1="38" y1="30" x2="34" y2="34" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AsesorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Person */}
      <circle cx="20" cy="14" r="6" className="stroke-current" strokeWidth="2" fill="none" />
      <path d="M8 38 C8 28 12 24 20 24 C28 24 32 28 32 38" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Checkmark badge */}
      <circle cx="36" cy="14" r="8" className="fill-current opacity-20 stroke-current" strokeWidth="1.5" />
      <path d="M32 14 L35 17 L40 11" className="stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function DesarrolloIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Magnifying glass */}
      <circle cx="20" cy="20" r="10" className="stroke-current" strokeWidth="2" fill="none" />
      <line x1="27" y1="27" x2="36" y2="36" className="stroke-current" strokeWidth="2.5" strokeLinecap="round" />
      {/* Chart bars inside */}
      <rect x="15" y="20" width="3" height="6" rx="1" className="fill-current opacity-40" />
      <rect x="19" y="16" width="3" height="10" rx="1" className="fill-current opacity-60" />
      <rect x="23" y="18" width="3" height="8" rx="1" className="fill-current opacity-40" />
      {/* Sparkle */}
      <path d="M38 8 L39.5 12 L43.5 10.5 L41 14 L44 17 L39.5 15.5 L38 19 L37 15.5 L33 17 L35.5 14 L33 10.5 L37 12 Z" className="fill-current opacity-30" />
    </svg>
  );
}

export function SustentacionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Trophy */}
      <path d="M16 12 L16 24 C16 30 20 34 24 34 C28 34 32 30 32 24 L32 12 Z" className="stroke-current" strokeWidth="2" fill="none" />
      <line x1="12" y1="12" x2="36" y2="12" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
      {/* Trophy handles */}
      <path d="M16 16 C12 16 10 18 10 22 C10 26 13 26 16 24" className="stroke-current" strokeWidth="1.5" fill="none" />
      <path d="M32 16 C36 16 38 18 38 22 C38 26 35 26 32 24" className="stroke-current" strokeWidth="1.5" fill="none" />
      {/* Base */}
      <line x1="24" y1="34" x2="24" y2="40" className="stroke-current" strokeWidth="2" />
      <line x1="18" y1="40" x2="30" y2="40" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
      {/* Star */}
      <path d="M24 18 L25.5 22 L30 22 L26.5 24.5 L28 28.5 L24 26 L20 28.5 L21.5 24.5 L18 22 L22.5 22 Z" className="fill-current opacity-30" />
    </svg>
  );
}

/* ── CTA Illustration ── */

export function CtaIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Open book */}
      <path d="M40 120 L100 100 L100 30 L40 50 Z" fill="white" fillOpacity="0.15" />
      <path d="M160 120 L100 100 L100 30 L160 50 Z" fill="white" fillOpacity="0.1" />
      <line x1="100" y1="30" x2="100" y2="100" stroke="white" strokeOpacity="0.3" strokeWidth="1" />
      {/* Lines on pages */}
      <line x1="55" y1="65" x2="90" y2="55" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="55" y1="75" x2="90" y2="65" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="55" y1="85" x2="85" y2="75" stroke="white" strokeOpacity="0.1" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="110" y1="55" x2="145" y2="65" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="110" y1="65" x2="145" y2="75" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" strokeLinecap="round" />
      {/* Graduation cap */}
      <polygon points="100,10 60,30 100,50 140,30" fill="white" fillOpacity="0.2" />
      <polygon points="100,20 75,32 100,44 125,32" fill="white" fillOpacity="0.1" />
      {/* Floating elements */}
      <circle cx="30" cy="30" r="6" fill="white" fillOpacity="0.08" />
      <circle cx="170" cy="25" r="4" fill="white" fillOpacity="0.1" />
      <circle cx="175" cy="90" r="8" fill="white" fillOpacity="0.06" />
      <rect x="20" y="90" width="10" height="10" rx="2" fill="white" fillOpacity="0.05" transform="rotate(15 25 95)" />
      {/* Sparkle */}
      <path d="M165 40 L167 46 L173 44 L169 48 L173 54 L167 50 L165 56 L163 50 L157 54 L161 48 L157 44 L163 46 Z" fill="white" fillOpacity="0.15" />
    </svg>
  );
}

/* ── Abstract accent line for section headers ── */

export function SectionAccent({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="2" width="30" height="4" rx="2" className="fill-primary" />
      <rect x="35" y="2" width="15" height="4" rx="2" className="fill-primary/60" />
      <rect x="55" y="2" width="8" height="4" rx="2" className="fill-primary/30" />
    </svg>
  );
}
