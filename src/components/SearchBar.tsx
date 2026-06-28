import { useEffect, useRef, useState } from "react";
import { completeAddress } from "../services/geocoding";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { AddressSuggestion } from "../types";
import "./SearchBar.css";

interface SearchBarProps {
  onSelect: (suggestion: AddressSuggestion) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(-1);

  const debouncedQuery = useDebouncedValue(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  // Quand on choisit une suggestion, on remet la query sans relancer une recherche.
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (debouncedQuery.trim().length < 3) {
      setSuggestions([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    completeAddress(debouncedQuery, { signal: controller.signal })
      .then((results) => {
        setSuggestions(results);
        setOpen(true);
        setHighlight(-1);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Recherche impossible pour le moment.");
        setSuggestions([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debouncedQuery]);

  // Ferme la liste si on clique en dehors.
  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function choose(suggestion: AddressSuggestion) {
    skipNextSearch.current = true;
    setQuery(suggestion.label);
    setOpen(false);
    setSuggestions([]);
    setHighlight(-1);
    onSelect(suggestion);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter" && highlight >= 0) {
      event.preventDefault();
      choose(suggestions[highlight]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="searchbar" ref={containerRef}>
      <div className="searchbar__field">
        <span className="searchbar__icon" aria-hidden>
          ⌕
        </span>
        <input
          type="text"
          className="searchbar__input"
          placeholder="Rechercher une adresse, une commune…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          aria-label="Recherche d'adresse"
        />
        {loading && <span className="searchbar__spinner" aria-hidden />}
        {query && !loading && (
          <button
            type="button"
            className="searchbar__clear"
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              setError(null);
            }}
            aria-label="Effacer"
          >
            ✕
          </button>
        )}
      </div>

      {open && (suggestions.length > 0 || error) && (
        <ul className="searchbar__list" role="listbox">
          {error && <li className="searchbar__error">{error}</li>}
          {suggestions.map((s, index) => (
            <li
              key={s.id}
              role="option"
              aria-selected={index === highlight}
              className={
                "searchbar__item" +
                (index === highlight ? " searchbar__item--active" : "")
              }
              onMouseEnter={() => setHighlight(index)}
              onMouseDown={(e) => {
                // mousedown pour devancer le blur de l'input.
                e.preventDefault();
                choose(s);
              }}
            >
              <span className="searchbar__item-label">{s.label}</span>
              <span className="searchbar__item-kind">
                {s.kind === "StreetAddress" ? "Adresse" : "Lieu"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
