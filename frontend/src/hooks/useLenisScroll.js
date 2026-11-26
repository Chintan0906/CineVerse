import { useEffect, useRef } from "react";
import Lenis from "lenis";

/**
 * Initializes global Lenis inertia smooth scrolling and keeps it synced
 * with route transitions while yielding to full-screen overlays & modals.
 */
export function useLenisScroll(routeKey) {
  const lenisRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReduced) return undefined;

    const lenis = new Lenis({
      lerp: 0.075,
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4,
      prevent: (node) =>
        Boolean(
          node?.closest?.(
            ".player-overlay, .trailer-modal, .spotlight-overlay, [data-lenis-prevent]"
          )
        ),
    });

    lenisRef.current = lenis;
    let rafId = 0;

    const raf = (time) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };

    rafId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      lenisRef.current?.resize();
    }, 120);
    return () => clearTimeout(timer);
  }, [routeKey]);

  return lenisRef;
}
