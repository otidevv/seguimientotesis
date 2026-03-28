"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

/**
 * Layered GSAP ScrollTrigger animations for the landing page.
 * Uses fromTo() instead of from() to avoid the "invisible forever" bug
 * when elements are already past the trigger point on mount.
 */
export function GsapLanding() {
  const ctxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    // WSG 2.5 — Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      document.querySelectorAll<HTMLElement>("[data-gsap]").forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }

    // Small delay to ensure SSR hydration is complete and DOM is settled
    const timeout = setTimeout(() => {
      ctxRef.current = gsap.context(() => {
        // ─── 0. HERO TITLE — SplitText char reveal + revert ───
        const heroTitle = document.querySelector<HTMLElement>("[data-gsap='hero-title']");
        if (heroTitle) {
          gsap.set(heroTitle, { opacity: 1 });
          const split = SplitText.create(heroTitle, { type: "chars, words", charsClass: "char" });

          gsap.from(split.chars, {
            opacity: 0,
            scale: 0,
            y: 80,
            rotationX: 180,
            transformOrigin: "0% 50% -50",
            duration: 1,
            ease: "back",
            stagger: 0.04,
            delay: 0.2,
            onComplete: () => {
              split.revert();
              heroTitle.classList.remove("opacity-0");
              heroTitle.removeAttribute("style");
            },
          });
        }

        // ─── 1. STATS COUNTER + STAGGER ───
        const statCards = gsap.utils.toArray<HTMLElement>("[data-gsap='stat-card']");
        if (statCards.length) {
          gsap.fromTo(statCards,
            { y: 50, opacity: 0, scale: 0.9 },
            {
              y: 0, opacity: 1, scale: 1,
              duration: 0.7,
              stagger: 0.12,
              ease: "back.out(1.4)",
              scrollTrigger: {
                trigger: "[data-gsap='stats']",
                start: "top 85%",
                toggleActions: "play none none none",
              },
            }
          );

          // Counter animation
          statCards.forEach((card) => {
            const numEl = card.querySelector("[data-gsap='stat-number']");
            if (!numEl) return;
            const raw = numEl.textContent || "0";
            const match = raw.match(/(\d+)/);
            if (!match) return;
            const target = parseInt(match[1], 10);
            const suffix = raw.replace(match[1], "");
            const obj = { val: 0 };

            gsap.to(obj, {
              val: target,
              duration: 1.8,
              ease: "power2.out",
              scrollTrigger: {
                trigger: card,
                start: "top 88%",
                toggleActions: "play none none none",
              },
              onUpdate() {
                numEl.textContent = `${Math.round(obj.val)}${suffix}`;
              },
            });
          });
        }

        // ─── 3. SECTION HEADERS ───
        gsap.utils.toArray<HTMLElement>("[data-gsap='section-header']").forEach((el) => {
          // Query direct children or first-level descendants
          const badge = el.querySelector(":scope > div, :scope > span");
          const h2 = el.querySelector("h2");
          const accent = el.querySelector("svg");
          const p = el.querySelector("p");

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          });

          if (badge) tl.fromTo(badge,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
          );
          if (h2) tl.fromTo(h2,
            { opacity: 0, y: 25 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
            "-=0.3"
          );
          if (accent) tl.fromTo(accent,
            { scaleX: 0 },
            { scaleX: 1, duration: 0.5, ease: "power2.out" },
            "-=0.3"
          );
          if (p) tl.fromTo(p,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
            "-=0.2"
          );
        });

        // ─── 4. FEATURES CARDS ───
        const featureCards = gsap.utils.toArray<HTMLElement>("[data-gsap='feature-card']");
        if (featureCards.length) {
          gsap.fromTo(featureCards,
            { y: 60, opacity: 0, scale: 0.92 },
            {
              y: 0, opacity: 1, scale: 1,
              duration: 0.6,
              stagger: { amount: 0.6, from: "start" },
              ease: "power3.out",
              scrollTrigger: {
                trigger: "[data-gsap='features-grid']",
                start: "top 82%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        // ─── 5. PROCESS STEPS — scrub-linked sequential reveal ───
        const processSection = document.querySelector("[id='proceso']");
        const processSteps = gsap.utils.toArray<HTMLElement>("[data-gsap='process-step']");
        if (processSection && processSteps.length) {
          const processTl = gsap.timeline({
            scrollTrigger: {
              trigger: processSection,
              start: "top 60%",
              end: "bottom 70%",
              scrub: 0.8,
            },
          });

          processSteps.forEach((step, i) => {
            const icon = step.querySelector("[data-gsap='process-icon']");
            const badge = step.querySelector("[data-gsap='process-badge']");
            const text = step.querySelector("[data-gsap='process-text']");
            const peep = step.querySelector("[data-gsap='process-peep']");
            const connector = step.querySelector("[data-gsap='process-connector']");

            const pos = i * 0.8;

            // Icon drops in with bounce
            if (icon) processTl.fromTo(icon,
              { scale: 0, rotate: -90, opacity: 0 },
              { scale: 1, rotate: 0, opacity: 1, duration: 0.6, ease: "back.out(1.7)" },
              pos
            );
            // Badge pops
            if (badge) processTl.fromTo(badge,
              { scale: 0, opacity: 0 },
              { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(3)" },
              pos + 0.2
            );
            // Text slides up
            if (text) processTl.fromTo(text,
              { opacity: 0, y: 30 },
              { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
              pos + 0.3
            );
            // Peep bounces in
            if (peep) processTl.fromTo(peep,
              { opacity: 0, y: 40, scale: 0.7 },
              { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.5)" },
              pos + 0.35
            );
            // Connector draws to next step
            if (connector) processTl.fromTo(connector,
              { scaleX: 0, transformOrigin: "left center" },
              { scaleX: 1, duration: 0.6, ease: "power2.inOut" },
              pos + 0.4
            );
          });
        }

        // ─── 6. FAQ ACCORDION ───
        const faqItems = gsap.utils.toArray<HTMLElement>("[data-gsap='faq-item']");
        if (faqItems.length) {
          gsap.fromTo(faqItems,
            { x: 40, opacity: 0 },
            {
              x: 0, opacity: 1,
              duration: 0.5,
              stagger: 0.08,
              ease: "power2.out",
              scrollTrigger: {
                trigger: "[data-gsap='faq-content']",
                start: "top 85%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        // ─── 8. CTA CARD ───
        const ctaCard = document.querySelector("[data-gsap='cta-card']");
        if (ctaCard) {
          gsap.fromTo(ctaCard,
            { y: 60, opacity: 0, scale: 0.92 },
            {
              y: 0, opacity: 1, scale: 1,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: ctaCard,
                start: "top 88%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        // ─── 9. FOOTER ───
        const footer = document.querySelector("[data-gsap='footer']");
        if (footer) {
          const footerChildren = gsap.utils.toArray<HTMLElement>(footer.children);
          gsap.fromTo(footerChildren,
            { y: 30, opacity: 0 },
            {
              y: 0, opacity: 1,
              duration: 0.6,
              stagger: 0.1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: footer,
                start: "top 92%",
                toggleActions: "play none none none",
              },
            }
          );
        }
      });
    }, 100); // 100ms delay ensures hydration + paint is done

    return () => {
      clearTimeout(timeout);
      ctxRef.current?.revert();
    };
  }, []);

  return null;
}
