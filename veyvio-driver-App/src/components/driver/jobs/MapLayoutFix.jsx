import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * Leaflet / MapLibre-GL-Leaflet often paint a blank canvas when the container
 * size changes (bottom sheet open/close, instruction card, keyboard, dvh).
 * Keep invalidateSize + GL resize in sync with the layout.
 */
export default function MapLayoutFix({ revision = 0 }) {
  const map = useMap();

  useEffect(() => {
    const paint = () => {
      try {
        map.invalidateSize({ animate: false });
        map.eachLayer((layer) => {
          const glMap = typeof layer.getMaplibreMap === "function" ? layer.getMaplibreMap() : null;
          if (glMap && typeof glMap.resize === "function") {
            glMap.resize();
          }
        });
      } catch {
        /* map may be mid-teardown */
      }
    };

    const timers = [0, 50, 160, 420, 900].map((ms) => window.setTimeout(paint, ms));

    const container = map.getContainer();
    let observer = null;
    if (typeof ResizeObserver !== "undefined" && container) {
      observer = new ResizeObserver(() => {
        paint();
      });
      observer.observe(container);
      if (container.parentElement) observer.observe(container.parentElement);
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") paint();
    };
    const onOrient = () => paint();
    window.addEventListener("resize", paint);
    window.addEventListener("orientationchange", onOrient);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      observer?.disconnect();
      window.removeEventListener("resize", paint);
      window.removeEventListener("orientationchange", onOrient);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [map, revision]);

  return null;
}
