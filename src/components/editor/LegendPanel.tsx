import { useMemo, useState } from "react";
import { CATEGORIES, SYMBOLS, svgToDataUrl } from "./symbols";
import type { SymbolDef } from "./symbols";
import "./LegendPanel.css";

interface Props {
  onClose: () => void;
}

function SymbolIcon({ def }: { def: SymbolDef }) {
  if (def.kind === "svg" && def.svg) {
    return (
      <img className="legend__icon-img" src={svgToDataUrl(def.svg)} alt={def.label} />
    );
  }
  if (def.kind === "text") {
    return (
      <span className="legend__icon-text" style={{ color: def.color }}>
        {def.text}
      </span>
    );
  }
  return <span className="legend__icon-emoji">{def.text}</span>;
}

// Panneau de consultation de la légende des symboles (lecture seule).
export default function LegendPanel({ onClose }: Props) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        ...cat,
        items: SYMBOLS.filter(
          (s) => s.category === cat.id && (!q || s.label.toLowerCase().includes(q)),
        ),
      })).filter((g) => g.items.length > 0),
    [q],
  );

  return (
    <div className="legend" role="dialog" aria-label="Légende des symboles">
      <div className="legend__backdrop" onClick={onClose} />
      <div className="legend__sheet">
        <header className="legend__header">
          <h2 className="legend__title">Légende des symboles</h2>
          <button
            type="button"
            className="legend__close"
            onClick={onClose}
            aria-label="Fermer la légende"
          >
            ✕
          </button>
        </header>

        <input
          type="search"
          className="legend__search"
          placeholder="Rechercher un symbole…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="legend__content">
          {groups.map((group) => (
            <section key={group.id} className="legend__group">
              <h3 className="legend__group-title">{group.label}</h3>
              <ul className="legend__list">
                {group.items.map((def) => (
                  <li key={def.id} className="legend__item">
                    <span className="legend__icon">
                      <SymbolIcon def={def} />
                    </span>
                    <span className="legend__label">{def.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {groups.length === 0 && (
            <p className="legend__empty">Aucun symbole ne correspond.</p>
          )}
        </div>
      </div>
    </div>
  );
}
