import type { EditorBaseLayer, ToolKind } from "../../types";
import { SYMBOLS, svgToDataUrl } from "./symbols";
import "./Toolbar.css";

interface Props {
  tool: ToolKind;
  setTool: (t: ToolKind) => void;
  color: string;
  setColor: (c: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  currentSymbol: string;
  setCurrentSymbol: (s: string) => void;
  baseLayer: EditorBaseLayer;
  setBaseLayer: (l: EditorBaseLayer) => void;
  showCadastre: boolean;
  setShowCadastre: (v: boolean) => void;
  canUndo: boolean;
  onUndo: () => void;
  hasSelection: boolean;
  onDeleteSelected: () => void;
  onClear: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onResetNorth: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExport: () => void;
  onBack: () => void;
}

const TOOLS: { kind: ToolKind; icon: string; label: string }[] = [
  { kind: "select", icon: "↖", label: "Sélection" },
  { kind: "pan", icon: "✋", label: "Déplacer la carte" },
  { kind: "pen", icon: "✎", label: "Crayon" },
  { kind: "line", icon: "／", label: "Trait" },
  { kind: "arrow", icon: "➜", label: "Flèche" },
  { kind: "rect", icon: "▭", label: "Rectangle" },
  { kind: "ellipse", icon: "◯", label: "Ellipse" },
  { kind: "text", icon: "T", label: "Texte" },
  { kind: "symbol", icon: "★", label: "Symbole" },
];

const COLORS = ["#d62828", "#1b6ec2", "#2a9d8f", "#e9c46a", "#000000", "#ffffff"];

export default function Toolbar(props: Props) {
  return (
    <div className="toolbar">
      <div className="toolbar__group">
        <button
          type="button"
          className="toolbar__btn toolbar__btn--ghost"
          onClick={props.onBack}
          title="Retour à la carte"
        >
          ‹ Carte
        </button>
      </div>

      <div className="toolbar__group">
        {TOOLS.map((t) => (
          <button
            key={t.kind}
            type="button"
            className={
              "toolbar__btn" + (props.tool === t.kind ? " toolbar__btn--active" : "")
            }
            onClick={() => props.setTool(t.kind)}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {props.tool === "symbol" && (
        <div className="toolbar__group toolbar__symbols">
          {SYMBOLS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={
                "toolbar__symbol" +
                (props.currentSymbol === s.id ? " toolbar__symbol--active" : "")
              }
              onClick={() => props.setCurrentSymbol(s.id)}
              title={s.label}
            >
              {s.kind === "svg" && s.svg ? (
                <img
                  src={svgToDataUrl(s.svg)}
                  alt={s.label}
                  className="toolbar__symbol-img"
                />
              ) : s.kind === "text" ? (
                <span className="toolbar__symbol-text">{s.text}</span>
              ) : (
                s.text
              )}
            </button>
          ))}
        </div>
      )}

      <div className="toolbar__group">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={
              "toolbar__swatch" + (props.color === c ? " toolbar__swatch--active" : "")
            }
            style={{ background: c }}
            onClick={() => props.setColor(c)}
            title={c}
          />
        ))}
        <input
          type="color"
          className="toolbar__color"
          value={props.color}
          onChange={(e) => props.setColor(e.target.value)}
          title="Couleur personnalisée"
        />
      </div>

      <div className="toolbar__group">
        <input
          type="range"
          min={1}
          max={24}
          value={props.strokeWidth}
          onChange={(e) => props.setStrokeWidth(Number(e.target.value))}
          title="Épaisseur"
        />
        <span className="toolbar__width">{props.strokeWidth}px</span>
      </div>

      <div className="toolbar__group">
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

      <div className="toolbar__group">
        <button
          type="button"
          className="toolbar__btn"
          onClick={props.onZoomOut}
          title="Dézoomer"
        >
          －
        </button>
        <button
          type="button"
          className="toolbar__btn"
          onClick={props.onZoomIn}
          title="Zoomer"
        >
          ＋
        </button>
        <button
          type="button"
          className="toolbar__btn"
          onClick={props.onFit}
          title="Recadrer sur la parcelle"
        >
          ⤢
        </button>
      </div>

      <div className="toolbar__group">
        <button
          type="button"
          className="toolbar__btn"
          onClick={props.onRotateLeft}
          title="Pivoter à gauche"
        >
          ⟲
        </button>
        <button
          type="button"
          className="toolbar__btn"
          onClick={props.onRotateRight}
          title="Pivoter à droite"
        >
          ⟳
        </button>
        <button
          type="button"
          className="toolbar__btn"
          onClick={props.onResetNorth}
          title="Remettre au nord"
        >
          ⬆N
        </button>
      </div>

      <div className="toolbar__group">
        <button
          type="button"
          className="toolbar__btn"
          onClick={props.onUndo}
          disabled={!props.canUndo}
          title="Annuler"
        >
          ↶
        </button>
        <button
          type="button"
          className="toolbar__btn"
          onClick={props.onDeleteSelected}
          disabled={!props.hasSelection}
          title="Supprimer la sélection"
        >
          🗑
        </button>
        <button
          type="button"
          className="toolbar__btn"
          onClick={props.onClear}
          title="Tout effacer"
        >
          ⤫
        </button>
      </div>

      <div className="toolbar__group toolbar__group--right">
        <button type="button" className="toolbar__btn" onClick={props.onSave} title="Enregistrer">
          Enregistrer
        </button>
        <button
          type="button"
          className="toolbar__btn"
          onClick={props.onSaveAs}
          title="Enregistrer sous"
        >
          Enregistrer sous…
        </button>
        <button
          type="button"
          className="toolbar__btn toolbar__btn--primary"
          onClick={props.onExport}
          title="Exporter en PNG"
        >
          Exporter PNG
        </button>
      </div>
    </div>
  );
}
