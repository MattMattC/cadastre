import { useState } from "react";
import SearchBar from "./components/SearchBar";
import MapView from "./components/MapView";
import type { AddressSuggestion } from "./types";
import "./App.css";

export default function App() {
  const [selected, setSelected] = useState<AddressSuggestion | null>(null);

  return (
    <div className="app">
      <header className="app__topbar">
        <div className="app__brand">
          <span className="app__logo" aria-hidden>
            ◳
          </span>
          <span className="app__title">Cadastre&nbsp;Bis</span>
        </div>
        <div className="app__search">
          <SearchBar onSelect={setSelected} />
        </div>
      </header>

      <main className="app__map">
        <MapView selected={selected} />
      </main>

      {selected && (
        <div className="app__info">
          <strong>{selected.label}</strong>
          <span className="app__info-coords">
            {selected.lat.toFixed(5)}, {selected.lon.toFixed(5)}
            {selected.citycode ? ` · INSEE ${selected.citycode}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
