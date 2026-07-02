import { useState } from "react";
import type { EditorBaseLayer } from "../../types";
import LegendPanel from "./LegendPanel";
import "./Toolbar.css";

interface Props {
  baseLayer: EditorBaseLayer;
  setBaseLayer: (l: EditorBaseLayer) => void;
  showCadastre: boolean;
  setShowCadastre: (v: boolean) => void;
  onBack: () => void;
}

export default function Toolbar(props: Props) {
  const [legendOpen, setLegendOpen] = useState(false);
  return (
    <div className="toolbar">
      {legendOpen && <LegendPanel onClose={() => setLegendOpen(false)} />}

      <button
        type="button"
        className="toolbar__btn toolbar__btn--ghost"
        onClick={props.onBack}
        title="Retour à la carte"
      >
        ‹ Carte
      </button>

      <div className="toolbar__maptype">
        <select
          className="toolbar__select"
          value={props.baseLayer}
          onChange={(e) => props.setBaseLayer(e.target.value as EditorBaseLayer)}
          title="Fond de carte"
        >
          <option value="ignPlan">Plan IGN</option>
          <option value="ignPhoto">Photo aérienne</option>
        </select>
        <label className="toolbar__check">
          <input
            type="checkbox"
            checked={props.showCadastre}
            onChange={(e) => props.setShowCadastre(e.target.checked)}
          />
          Cadastre
        </label>
      </div>

      <button
        type="button"
        className="toolbar__btn"
        onClick={() => setLegendOpen(true)}
        title="Légende des symboles"
      >
        ☰ Légende
      </button>
    </div>
  );
}
