import { type ReactNode } from "react";

interface SmoothScrollWrapperProps {
  children: ReactNode;
}

/**
 * Previously used GSAP ScrollSmoother (heavy RAF loop + touch interference).
 * Removed for WSG 2.2 (minimize device energy) and accessibility.
 * Native CSS scroll-behavior: smooth in globals.css handles smooth scrolling.
 */
export function SmoothScrollWrapper({ children }: SmoothScrollWrapperProps) {
  return <>{children}</>;
}
