import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import MapView from "../components/MapView";
import { boundsAreAdjacent, getParcelleAtPoint } from "../services/cadastre";
import { setPendingParcelles } from "../store/projects";
import type { AddressSuggestion, Parcelle } from "../types";
import "./MapPage.css";

export default function MapPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AddressSuggestion | null>(null);
  const [parcelles, setParcelles] = useState<Parcelle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Annule une requête de parcelle obsolète si on reclique vite.
  const controllerRef = useRef<AbortController | null>(null);

  async function handleMapClick(lat: number, lon: number) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await getParcelleAtPoint(lat, lon, controller.signal);
      if (!result) {
        setError("Aucune parcelle cadastrale à cet endroit.");
        return;
      }

      setParcelles((prev) => {
        const exists = prev.some((p) => p.id === result.id);
        if (exists) return prev.filter((p) => p.id !== result.id);

        if (prev.length === 0) return [result];

        const adjacent = prev.some((p) => boundsAreAdjacent(p.bounds, result.bounds));
        if (adjacent) return [...prev, result];

        // Parcelle non adjacente : on remplace la sélection.
        return [result];
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Impossible de récupérer la parcelle.");
    } finally {
      setLoading(false);
    }
  }

  function annotate() {
    if (parcelles.length === 0) return;
    setPendingParcelles(parcelles);
    navigate("/editor");
  }

  return (
    <div className="map-page">
      <header className="map-page__topbar">
        <div className="map-page__brand">
          <span className="map-page__logo" aria-hidden>
            ◳
          </span>
          <span className="map-page__title">Cadastre&nbsp;Bis</span>
        </div>
        <div className="map-page__search">
          <SearchBar onSelect={setSelected} />
        </div>
      </header>

      <main className="map-page__map">
        <MapView
          selected={selected}
          parcelles={parcelles}
          onMapClick={handleMapClick}
        />
      </main>

      {parcelles.length === 0 && !loading && (
        <div className="map-page__hint">
          Touchez une parcelle sur la carte pour la sélectionner. Touchez des
          parcelles adjacentes pour en ajouter d'autres.
        </div>
      )}

      {loading && <div className="map-page__hint">Recherche de la parcelle…</div>}

      {error && !loading && (
        <div className="map-page__hint map-page__hint--error">{error}</div>
      )}

      {parcelles.length > 0 && (
        <div className="map-page__parcelle">
          <div className="map-page__parcelle-info">
            <strong>
              {parcelles.length === 1
                ? `Parcelle ${parcelles[0].section} ${parcelles[0].numero}`
                : `${parcelles.length} parcelles sélectionnées`}
            </strong>
            <span className="map-page__parcelle-meta">
              {parcelles[0].commune ? `${parcelles[0].commune} · ` : ""}
              INSEE {parcelles[0].codeInsee}
              {parcelles.length === 1 && parcelles[0].surface
                ? ` · ${parcelles[0].surface} m²`
                : ""}
            </span>
            {parcelles.length > 1 && (
              <span className="map-page__parcelle-list">
                {parcelles
                  .map((p) => `${p.section} ${p.numero}`)
                  .join(" · ")}
              </span>
            )}
          </div>
          <button
            type="button"
            className="map-page__annotate"
            onClick={annotate}
          >
            Annoter ✎
          </button>
        </div>
      )}
    </div>
  );
}
