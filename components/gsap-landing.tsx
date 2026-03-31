"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/**
 * Enhanced GSAP ScrollTrigger animations for the landing page.
 * Hero text uses CSS animations (hero-line-reveal) as the base,
 * with optional SplitText upgrade when GSAP loads in time.
 */
export function GsapLanding() {
  const ctxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    gsap.config({ force3D: true });

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      document.querySelectorAll<HTMLElement>("[data-gsap]").forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }

    const timeout = setTimeout(() => {
      ctxRef.current = gsap.context(() => {

        // ─── 0. HERO — CSS handles base reveal; SplitText upgrades if possible ───
        const heroLines = gsap.utils.toArray<HTMLElement>("[data-gsap='hero-line']");
        const splits: InstanceType<typeof SplitText>[] = [];

        // Only upgrade to SplitText if CSS animation hasn't finished yet
        const firstLine = heroLines[0];
        const cssAnimDone = firstLine ? getComputedStyle(firstLine).opacity === "1" : true;

        if (!cssAnimDone && heroLines.length) {
          heroLines.forEach((line, lineIdx) => {
            try {
              // Stop the CSS animation, let GSAP take over
              line.classList.add("gsap-enhanced");
              const split = SplitText.create(line, { type: "chars", charsClass: "char" });
              splits.push(split);

              gsap.set(split.chars, { opacity: 0, scale: 0, y: 60, rotationX: 120 });
              gsap.to(split.chars, {
                opacity: 1, scale: 1, y: 0, rotationX: 0,
                transformOrigin: "0% 50% -50",
                duration: 1.2, ease: "back.out(1.7)",
                stagger: 0.03, delay: 0.2 + lineIdx * 0.3,
              });
            } catch {
              // SplitText failed — CSS animation will handle it
              line.classList.remove("gsap-enhanced");
            }
          });

          // Revert splits after animation completes
          if (splits.length) {
            const revertDelay = 0.2 + heroLines.length * 0.3 + 41 * 0.03 + 1.2 + 1;
            gsap.delayedCall(revertDelay, () => {
              splits.forEach((s) => s.revert());
              heroLines.forEach((line) => {
                line.classList.remove("gsap-enhanced");
                line.style.opacity = "1";
              });
            });
          }
        }

        // ─── 0b. HERO PARALLAX ───
        gsap.utils.toArray<HTMLElement>("[data-speed]").forEach((el) => {
          const speed = parseFloat(el.dataset.speed || "0.5");
          gsap.to(el, {
            yPercent: (1 - speed) * -50,
            ease: "none",
            scrollTrigger: {
              trigger: el.closest("section") || el,
              start: "top top",
              end: "bottom top",
              scrub: 0.5,
            },
          });
        });

        // ─── 1. SECTION TRANSITIONS ───
        const sections = gsap.utils.toArray<HTMLElement>(
          "#caracteristicas, #proceso, #faq, [data-gsap='stats'], section.bg-muted:last-of-type"
        );
        sections.forEach((section) => {
          const inner = section.querySelector(".container") || section.firstElementChild;
          if (!inner) return;
          gsap.fromTo(inner as HTMLElement,
            { y: 80, opacity: 0 },
            {
              y: 0, opacity: 1, duration: 1, ease: "power3.out",
              scrollTrigger: { trigger: section, start: "top 82%", toggleActions: "play none none none" },
            }
          );
        });

        // ─── 1b. WAVE SVG TRANSITIONS ───
        gsap.utils.toArray<HTMLElement>("svg[viewBox='0 0 500 150']").forEach((svg) => {
          gsap.fromTo(svg,
            { opacity: 0, scaleY: 0.3 },
            {
              opacity: 1, scaleY: 1, duration: 0.8, ease: "power2.out",
              scrollTrigger: { trigger: svg, start: "top 92%", toggleActions: "play none none none" },
            }
          );
        });

        // ─── 2. STATS ───
        const statCards = gsap.utils.toArray<HTMLElement>("[data-gsap='stat-card']");
        if (statCards.length) {
          gsap.fromTo(statCards,
            { y: 60, opacity: 0, scale: 0.85, rotateY: 15 },
            {
              y: 0, opacity: 1, scale: 1, rotateY: 0,
              duration: 0.8, stagger: 0.15, ease: "back.out(1.4)",
              scrollTrigger: { trigger: "[data-gsap='stats']", start: "top 85%", toggleActions: "play none none none" },
            }
          );
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
              val: target, duration: 2, ease: "power2.out",
              scrollTrigger: { trigger: card, start: "top 88%", toggleActions: "play none none none" },
              onUpdate() { numEl.textContent = `${Math.round(obj.val)}${suffix}`; },
            });
          });
        }

        // ─── 3. SECTION HEADERS ───
        gsap.utils.toArray<HTMLElement>("[data-gsap='section-header']").forEach((el) => {
          const badge = el.querySelector(":scope > div, :scope > span");
          const h2 = el.querySelector("h2");
          const accent = el.querySelector("svg");
          const p = el.querySelector("p");
          const tl = gsap.timeline({
            scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" },
          });
          if (badge) tl.fromTo(badge, { opacity: 0, y: 25, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power2.out" });
          if (h2) tl.fromTo(h2, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, "-=0.3");
          if (accent) tl.fromTo(accent, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power2.out" }, "-=0.3");
          if (p) tl.fromTo(p, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.2");
        });

        // ─── 4. FEATURES CARDS ───
        const featureCards = gsap.utils.toArray<HTMLElement>("[data-gsap='feature-card']");
        if (featureCards.length) {
          gsap.fromTo(featureCards,
            { y: 80, opacity: 0, scale: 0.88, rotateX: 8 },
            {
              y: 0, opacity: 1, scale: 1, rotateX: 0,
              duration: 0.7, stagger: { amount: 0.8, from: "start" }, ease: "power3.out",
              scrollTrigger: { trigger: "[data-gsap='features-grid']", start: "top 82%", toggleActions: "play none none none" },
            }
          );
        }

        // ─── 5. PROCESS STEPS ───
        const processSection = document.querySelector("[id='proceso']");
        const processSteps = gsap.utils.toArray<HTMLElement>("[data-gsap='process-step']");
        if (processSection && processSteps.length) {
          const processTl = gsap.timeline({
            scrollTrigger: { trigger: processSection, start: "top 60%", end: "bottom 70%", scrub: 0.8 },
          });
          processSteps.forEach((step, i) => {
            const icon = step.querySelector("[data-gsap='process-icon']");
            const badge = step.querySelector("[data-gsap='process-badge']");
            const text = step.querySelector("[data-gsap='process-text']");
            const peep = step.querySelector("[data-gsap='process-peep']");
            const connector = step.querySelector("[data-gsap='process-connector']");
            const pos = i * 0.8;
            if (icon) processTl.fromTo(icon, { scale: 0, rotate: -90, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.6, ease: "back.out(1.7)" }, pos);
            if (badge) processTl.fromTo(badge, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(3)" }, pos + 0.2);
            if (text) processTl.fromTo(text, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, pos + 0.3);
            if (peep) processTl.fromTo(peep, { opacity: 0, y: 40, scale: 0.7 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.5)" }, pos + 0.35);
            if (connector) processTl.fromTo(connector, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.6, ease: "power2.inOut" }, pos + 0.4);
          });
        }

        // ─── 6. FAQ ITEMS ───
        const faqItems = gsap.utils.toArray<HTMLElement>("[data-gsap='faq-item']");
        if (faqItems.length) {
          gsap.fromTo(faqItems,
            { x: 40, opacity: 0 },
            {
              x: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power2.out",
              scrollTrigger: { trigger: faqItems[0], start: "top 88%", toggleActions: "play none none none" },
            }
          );
        }

        // ─── 7. CTA CARD ───
        const ctaCard = document.querySelector<HTMLElement>("[data-gsap='cta-card']");
        if (ctaCard) {
          gsap.fromTo(ctaCard,
            { y: 60, opacity: 0, scale: 0.92 },
            {
              y: 0, opacity: 1, scale: 1, duration: 0.9, ease: "power3.out",
              scrollTrigger: { trigger: ctaCard, start: "top 85%", toggleActions: "play none none none" },
            }
          );
        }

        // ─── 8. FOOTER ───
        const footer = document.querySelector<HTMLElement>("[data-gsap='footer']");
        if (footer) {
          const footerChildren = gsap.utils.toArray<HTMLElement>(footer.children);
          gsap.fromTo(footerChildren,
            { y: 40, opacity: 0 },
            {
              y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out",
              scrollTrigger: { trigger: footer, start: "top 90%", toggleActions: "play none none none" },
            }
          );
        }

        // ─── 9. HERO PARALLAX on decorative elements ───
        gsap.utils.toArray<HTMLElement>("[data-gsap='hero-blob']").forEach((el) => {
          gsap.to(el, {
            y: -100, rotation: 15, ease: "none",
            scrollTrigger: { trigger: el.closest("section"), start: "top top", end: "bottom top", scrub: 1 },
          });
        });
        gsap.utils.toArray<HTMLElement>("[data-gsap='hero-grid']").forEach((el) => {
          gsap.to(el, {
            y: -50, opacity: 0, ease: "none",
            scrollTrigger: { trigger: el.closest("section"), start: "top top", end: "80% top", scrub: 0.5 },
          });
        });

      });
    }, 200); // Slightly longer delay to survive Fast Refresh

    return () => {
      clearTimeout(timeout);
      // Don't fully revert in dev mode - just kill ScrollTriggers
      if (ctxRef.current) {
        ScrollTrigger.getAll().forEach(st => st.kill());
        gsap.killTweensOf("*");
        ctxRef.current = null;
      }
    };
  }, []);

  return null;
}
