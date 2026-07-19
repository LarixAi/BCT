/** Shared Leaflet icons for offer route maps */
import L from "leaflet";

const CAR_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`;

function circleCarIcon(color, size) {
  const half = size / 2;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">${CAR_SVG}</div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

export const offerPickupIcon = circleCarIcon("#22c55e", 32);
export const offerDropoffIcon = circleCarIcon("#ef4444", 32);
export const offerPickupIconCompact = circleCarIcon("#22c55e", 26);
export const offerDropoffIconCompact = circleCarIcon("#ef4444", 26);

export const driverDotIcon = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;background:#2563eb;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});
