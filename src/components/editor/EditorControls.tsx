import { useState } from "react";
import type { ReactNode } from "react";
import type { LineArrows, ToolKind } from "../../types";
import { SYMBOLS, svgToDataUrl } from "./symbols";
import "./EditorControls.css";

interface Props {
  tool: ToolKind;
  setTool: (t: ToolKind) => void;
  color: string;
  setColor: (c: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  lineDashed: boolean;
  setLineDashed: (d: boolean) => void;
  lineArrows: LineArrows;
  setLineArrows: (a: LineArrows) => void;
  currentSymbol: string;
  setCurrentSymbol: (s: string) => void;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  hasSelection: boolean;
  onDeleteSelected: () => void;
  onClear: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onResetNorth: () => void;
  onSave: () => void;
  onExport: () => void;
}

// Pictogramme gomme (pas d'emoji dédié en Unicode).
const ERASER_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <g transform="rotate(-45 12 12)">
      <rect x="3" y="8" width="18" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="12" y="8" width="9" height="8" rx="1.5" fill="currentColor" />
    </g>
  </svg>
);

const TOOLS: { kind: ToolKind; icon: ReactNode; label: string }[] = [
  { kind: "pan", icon: "✋", label: "Déplacer la carte" },
  {
    kind: "select",
    icon: "↖",
    label: "Sélectionner et déplacer une annotation",
  },
  { kind: "eraser", icon: ERASER_ICON, label: "Gomme : effacer au clic ou au passage" },
  { kind: "pen", icon: "✎", label: "Crayon" },
  { kind: "line", icon: "／", label: "Trait / flèche" },
  { kind: "rect", icon: "▭", label: "Rectangle" },
  { kind: "ellipse", icon: "◯", label: "Ellipse" },
  { kind: "text", icon: "T", label: "Texte" },
  { kind: "symbol", icon: "★", label: "Symbole" },
];

const LINE_STYLES: { dashed: boolean; icon: string; label: string }[] = [
  { dashed: false, icon: "━", label: "Trait plein" },
  { dashed: true, icon: "┅", label: "Trait en tirets" },
];

const LINE_ARROWS: { arrows: LineArrows; icon: string; label: string }[] = [
  { arrows: "none", icon: "—", label: "Sans flèche" },
  { arrows: "end", icon: "→", label: "Flèche à l'arrivée" },
  { arrows: "both", icon: "↔", label: "Flèche aux deux bouts" },
];

const COLORS = ["#d62828", "#1b6ec2", "#2a9d8f", "#e9c46a", "#000000", "#ffffff"];

export default function EditorControls(props: Props) {
  const stylable =
    props.tool !== "select" && props.tool !== "pan" && props.tool !== "eraser";
  // Sous-menu ouvert dans le dock bas-droite (un seul à la fois).
  const [openGroup, setOpenGroup] = useState<null | "nav" | "actions">(null);
  const toggleGroup = (g: "nav" | "actions") =>
    setOpenGroup((cur) => (cur === g ? null : g));

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
          {props.tool === "line" && (
            <div className="ec__opts">
              {LINE_STYLES.map((o) => (
                <button
                  key={String(o.dashed)}
                  type="button"
                  className={
                    "ec__opt" + (props.lineDashed === o.dashed ? " ec__opt--active" : "")
                  }
                  onClick={() => props.setLineDashed(o.dashed)}
                  title={o.label}
                  aria-label={o.label}
                >
                  {o.icon}
                </button>
              ))}
              <span className="ec__opts-sep" />
              {LINE_ARROWS.map((o) => (
                <button
                  key={o.arrows}
                  type="button"
                  className={
                    "ec__opt" + (props.lineArrows === o.arrows ? " ec__opt--active" : "")
                  }
                  onClick={() => props.setLineArrows(o.arrows)}
                  title={o.label}
                  aria-label={o.label}
                >
                  {o.icon}
                </button>
              ))}
            </div>
          )}
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

      {/* Bouton Éditer : visible dès qu'un texte est sélectionné (hors menu ⋯). */}
      <div className="ec ec--history">
        <button
          type="button"
          className="fab"
          onClick={props.onUndo}
          disabled={!props.canUndo}
          title="Précédent (Ctrl+Z)"
          aria-label="Précédent"
        >
          ↶
        </button>
        <button
          type="button"
          className="fab"
          onClick={props.onRedo}
          disabled={!props.canRedo}
          title="Suivant (Ctrl+Shift+Z)"
          aria-label="Suivant"
        >
          ↷
        </button>
      </div>

      {/* Dock bas-droite : deux sous-menus repliables (navigation / actions). */}
      <div className="ec ec--dock">
        {openGroup === "nav" && (
          <div className="ec__stack">
            <button type="button" className="fab" onClick={props.onZoomIn} title="Zoomer">
              ＋
            </button>
            <button type="button" className="fab" onClick={props.onZoomOut} title="Dézoomer">
              －
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
        )}

        {openGroup === "actions" && (
          <div className="ec__stack">
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
            <button type="button" className="fab" onClick={props.onSave} title="Enregistrer le projet">
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
        )}

        <div className="ec__toggles">
          <button
            type="button"
            className={"fab" + (openGroup === "nav" ? " fab--active" : "")}
            onClick={() => toggleGroup("nav")}
            title="Navigation carte"
            aria-label="Navigation carte"
          >
            🧭
          </button>
          <button
            type="button"
            className={"fab" + (openGroup === "actions" ? " fab--active" : "")}
            onClick={() => toggleGroup("actions")}
            title="Actions"
            aria-label="Actions"
          >
            ⋯
          </button>
        </div>
      </div>
    </>
  );
}
