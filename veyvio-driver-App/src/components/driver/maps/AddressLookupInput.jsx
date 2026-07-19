import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { op } from "@/lib/driver-operational-theme";
import { searchAddressSuggestions } from "@/lib/geocodeAddress";

const inputClass = (extra = "") => `w-full rounded-xl py-3 text-sm border pl-9 pr-9 ${op.input} ${extra}`;

/**
 * UK address autocomplete for driver operational forms.
 */
export default function AddressLookupInput({
  id: idProp,
  value,
  onValueChange,
  onLocationSelect,
  placeholder = "Start typing an address or postcode",
  className = "",
  disabled = false,
}) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listId = `${inputId}-suggestions`;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const skipSearchRef = useRef(false);

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    const q = value?.trim() ?? "";
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = window.setTimeout(() => {
      void searchAddressSuggestions(q, { limit: 6, signal: controller.signal })
        .then((rows) => {
          setSuggestions(rows);
          setOpen(rows.length > 0);
          setActiveIndex(-1);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
            setOpen(false);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function pickSuggestion(suggestion) {
    skipSearchRef.current = true;
    onValueChange(suggestion.address ?? suggestion.label);
    onLocationSelect?.({
      address: suggestion.address,
      label: suggestion.label,
      postcode: suggestion.postcode,
      lat: suggestion.lat,
      lng: suggestion.lng,
    });
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event) {
    if (!open || !suggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      pickSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={inputId}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className={inputClass("px-4")}
          onChange={(e) => {
            onValueChange(e.target.value);
            onLocationSelect?.(null);
          }}
          onFocus={() => {
            if (suggestions.length) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {loading ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`w-full px-3 py-2.5 text-left text-sm active:bg-muted ${
                  index === activeIndex ? "bg-muted" : ""
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(suggestion)}
              >
                <span className="block font-medium text-foreground">{suggestion.label}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{suggestion.address}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
