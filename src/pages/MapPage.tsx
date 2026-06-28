import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import MapView from "../components/MapView";
import { getParcelleAtPoint } from "../services/cadastre";
import { setPendingParcelle } from "../store/projects";
import type { AddressSuggestion, Parcelle } from "../types";
import "./MapPage.css";

export default function MapPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AddressSuggestion | null>(null);
  const [parcelle, setParcelle] = useState<Parcelle | null>(null);
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
      if (result) {
        setParcelle(result);
      } else {
        setParcelle(null);
        setError("Aucune parcelle cadastrale à cet endroit.");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Impossible de récupérer la parcelle.");
    } finally {
      setLoading(false);
    }
  }

  function annotate() {
    if (!parcelle) return;
    setPendingParcelle(parcelle);
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
          parcelle={parcelle}
          onMapClick={handleMapClick}
        />
      </main>

      {!parcelle && !loading && (
        <div className="map-page__hint">
          Touchez une parcelle sur la carte pour la sélectionner.
        </div>
      )}

      {loading && <div className="map-page__hint">Recherche de la parcelle…</div>}

      {error && !loading && (
        <div className="map-page__hint map-page__hint--error">{error}</div>
      )}

      {parcelle && (
        <div className="map-page__parcelle">
          <div className="map-page__parcelle-info">
            <strong>
              Parcelle {parcelle.section} {parcelle.numero}
            </strong>
            <span className="map-page__parcelle-meta">
              {parcelle.commune ? `${parcelle.commune} · ` : ""}
              INSEE {parcelle.codeInsee}
              {parcelle.surface ? ` · ${parcelle.surface} m²` : ""}
            </span>
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
