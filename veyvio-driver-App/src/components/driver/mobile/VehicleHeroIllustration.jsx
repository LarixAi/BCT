/** Stylised vehicle hero — Uber-style centred illustration when no photo on file. */
export default function VehicleHeroIllustration({ colour = "#E8E8E8" }) {
  return (
    <div className="w-full flex justify-center py-2 pointer-events-none select-none" aria-hidden>
      <svg
        viewBox="0 0 320 140"
        className="w-[min(100%,280px)] h-auto drop-shadow-sm"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="160" cy="118" rx="100" ry="10" fill="#000" fillOpacity="0.06" />
        <path
          d="M48 78c8-28 36-42 72-42h80c36 0 64 14 72 42l8 22H40l8-22z"
          fill={colour}
          stroke="#D1D5DB"
          strokeWidth="1.5"
        />
        <path d="M88 52c12-14 28-20 44-20h56c16 0 32 6 44 20" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
        <rect x="100" y="54" width="44" height="22" rx="4" fill="#BFDBFE" fillOpacity="0.85" />
        <rect x="176" y="54" width="44" height="22" rx="4" fill="#BFDBFE" fillOpacity="0.85" />
        <circle cx="92" cy="100" r="18" fill="#374151" />
        <circle cx="92" cy="100" r="10" fill="#9CA3AF" />
        <circle cx="228" cy="100" r="18" fill="#374151" />
        <circle cx="228" cy="100" r="10" fill="#9CA3AF" />
        <path d="M56 78h208" stroke="#9CA3AF" strokeWidth="1" strokeDasharray="4 4" />
      </svg>
    </div>
  );
}
