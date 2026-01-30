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
