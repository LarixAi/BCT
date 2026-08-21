import { useEffect, useRef, useState } from "react";

/** Scroll-reveal: opacity + translateY. Respects prefers-reduced-motion via CSS. */
export function useRevealOnScroll<T extends HTMLElement>(options?: { threshold?: number }) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: options?.threshold ?? 0.12 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [options?.threshold]);

  return { ref, visible };
}
