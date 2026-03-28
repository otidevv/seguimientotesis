"use client";

/**
 * BackgroundBeams — CSS-only animated SVG beams.
 * Replaced framer-motion with CSS keyframes for WSG 4.1 (efficient code).
 */
export function BackgroundBeams({ className = "" }: { className?: string }) {
  const paths = [
    "M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875",
    "M-373 -197C-373 -197 -305 208 159 335C623 462 691 867 691 867",
    "M-366 -205C-366 -205 -298 200 166 327C630 454 698 859 698 859",
    "M-359 -213C-359 -213 -291 192 173 319C637 446 705 851 705 851",
    "M-352 -221C-352 -221 -284 184 180 311C644 438 712 843 712 843",
    "M-345 -229C-345 -229 -277 176 187 303C651 430 719 835 719 835",
    "M-338 -237C-338 -237 -270 168 194 295C658 422 726 827 726 827",
    "M-331 -245C-331 -245 -263 160 201 287C665 414 733 819 733 819",
    "M-324 -253C-324 -253 -256 152 208 279C672 406 740 811 740 811",
    "M-317 -261C-317 -261 -249 144 215 271C679 398 747 803 747 803",
  ];

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <svg
        className="pointer-events-none absolute h-full w-full"
        viewBox="0 0 696 316"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke={`url(#beam-grad-${i})`}
            strokeWidth="0.5"
            strokeOpacity="0.15"
            className="beam-path"
            style={{
              strokeDasharray: 1000,
              strokeDashoffset: 1000,
              animation: `beam-draw ${4 + (i % 4)}s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
        ))}
        <defs>
          {paths.map((_, i) => (
            <linearGradient key={i} id={`beam-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
              <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
      </svg>
      <style>{`
        @keyframes beam-draw {
          0% { stroke-dashoffset: 1000; opacity: 0; }
          30% { opacity: 0.4; }
          70% { opacity: 0.4; }
          100% { stroke-dashoffset: -1000; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .beam-path { animation: none !important; stroke-dashoffset: 0; opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
