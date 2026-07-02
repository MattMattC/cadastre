import type { ToolKind } from "../../types";
import { SYMBOLS, svgToDataUrl } from "./symbols";
import "./EditorControls.css";

interface Props {
  tool: ToolKind;
  setTool: (t: ToolKind) => void;
  color: string;
  setColor: (c: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  currentSymbol: string;
  setCurrentSymbol: (s: string) => void;
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

export default function EditorControls(props: Props) {
  const stylable = props.tool !== "select" && props.tool !== "pan";

  return (
    <>
      {/* Outils de dessin : pile flottante à gauche. */}
      <div className="ec ec--tools">
        {TOOLS.map((t) => (
          <button
            key={t.kind}
            type="button"
            className={"fab" + (props.tool === t.kind ? " fab--active" : "")}
            onClick={() =>
              props.setTool(
                props.tool === t.kind && t.kind !== "select" ? "select" : t.kind,
              )
            }
            title={t.label}
            aria-label={t.label}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {/* Style (couleur + épaisseur) : visible quand un outil de dessin est actif. */}
      {stylable && (
        <div className="ec ec--style">
          <div className="ec__swatches">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={
                  "ec__swatch" + (props.color === c ? " ec__swatch--active" : "")
                }
                style={{ background: c }}
                onClick={() => props.setColor(c)}
                title={c}
                aria-label={"Couleur " + c}
              />
            ))}
            <input
              type="color"
              className="ec__color"
              value={props.color}
              onChange={(e) => props.setColor(e.target.value)}
              title="Couleur personnalisée"
            />
          </div>
          <div className="ec__stroke">
            <input
              type="range"
              min={1}
              max={24}
              value={props.strokeWidth}
              onChange={(e) => props.setStrokeWidth(Number(e.target.value))}
              title="Épaisseur"
            />
            <span className="ec__stroke-val">{props.strokeWidth}px</span>
          </div>
        </div>
      )}

      {/* Palette de symboles : visible avec l'outil Symbole. */}
      {props.tool === "symbol" && (
        <div className="ec ec--symbols">
          {SYMBOLS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={
                "ec__symbol" +
                (props.currentSymbol === s.id ? " ec__symbol--active" : "")
              }
              onClick={() => props.setCurrentSymbol(s.id)}
              title={s.label}
            >
              {s.kind === "svg" && s.svg ? (
                <img src={svgToDataUrl(s.svg)} alt={s.label} className="ec__symbol-img" />
              ) : s.kind === "text" ? (
                <span className="ec__symbol-text">{s.text}</span>
              ) : (
                s.text
              )}
            </button>
          ))}
        </div>
      )}

      {/* Navigation carte : pile flottante à droite. */}
      <div className="ec ec--nav">
        <button type="button" className="fab" onClick={props.onZoomIn} title="Zoomer">
          ＋
        </button>
        <button type="button" className="fab" onClick={props.onZoomOut} title="Dézoomer">
          －
        </button>
        <button
          type="button"
          className="fab"
          onClick={props.onFit}
          title="Recadrer sur la parcelle"
        >
          ⤢
        </button>
        <button
          type="button"
          className="fab"
          onClick={props.onRotateLeft}
          title="Pivoter à gauche"
        >
          ⟲
        </button>
        <button
          type="button"
          className="fab"
          onClick={props.onRotateRight}
          title="Pivoter à droite"
        >
          ⟳
        </button>
        <button
          type="button"
          className="fab"
          onClick={props.onResetNorth}
          title="Remettre au nord"
        >
          ⬆N
        </button>
      </div>

      {/* Actions : boutons flottants en bas à droite. */}
      <div className="ec ec--actions">
        <button
          type="button"
          className="fab"
          onClick={props.onUndo}
          disabled={!props.canUndo}
          title="Annuler"
        >
          ↶
        </button>
        <button
          type="button"
          className="fab"
          onClick={props.onDeleteSelected}
          disabled={!props.hasSelection}
          title="Supprimer la sélection"
        >
          🗑
        </button>
        <button type="button" className="fab" onClick={props.onClear} title="Tout effacer">
          ⤫
        </button>
        <button type="button" className="fab" onClick={props.onSaveAs} title="Enregistrer sous…">
          ⧉
        </button>
        <button type="button" className="fab" onClick={props.onSave} title="Enregistrer">
          💾
        </button>
        <button
          type="button"
          className="fab fab--primary"
          onClick={props.onExport}
          title="Exporter en PNG"
        >
          ⬇
        </button>
      </div>
    </>
  );
}
