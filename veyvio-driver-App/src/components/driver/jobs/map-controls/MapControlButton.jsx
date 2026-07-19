/** Shared floating circular map control (compact — sits above bottom sheet). */
export default function MapControlButton({ onClick, ariaLabel, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`w-11 h-11 rounded-full bg-white flex items-center justify-center active:scale-95 shadow-[0_2px_8px_rgba(0,0,0,0.14)] ${className}`}
    >
      {children}
    </button>
  );
}
