import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./InlineTextEditor.css";

interface Props {
  x: number;
  y: number;
  color: string;
  fontSize: number;
  initialValue?: string;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}

// Saisie de texte inline sur la carte (style Instagram / Snapchat Stories).
export default function InlineTextEditor({
  x,
  y,
  color,
  fontSize,
  initialValue = "",
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [pos, setPos] = useState({ x, y });
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
    resizeField(field);
  }, []);

  // Recalcule la position pour rester visible au-dessus du clavier mobile.
  useEffect(() => {
    function adjust() {
      const field = fieldRef.current;
      const vv = window.visualViewport;
      if (!field || !vv) return;

      let top = y;
      const rect = field.getBoundingClientRect();
      const visibleBottom = vv.offsetTop + vv.height - 12;
      if (rect.bottom > visibleBottom) {
        top -= rect.bottom - visibleBottom;
      }
      const visibleTop = vv.offsetTop + 56;
      if (rect.top < visibleTop) {
        top += visibleTop - rect.top;
      }
      setPos({ x, y: top });
    }

    adjust();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", adjust);
    vv?.addEventListener("scroll", adjust);
    window.addEventListener("resize", adjust);
    return () => {
      vv?.removeEventListener("resize", adjust);
      vv?.removeEventListener("scroll", adjust);
      window.removeEventListener("resize", adjust);
    };
  }, [x, y, value]);

  function resizeField(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function submit() {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  }

  // Rendu dans <body> : passe au-dessus de la barre d'outils du haut et
  // capte tous les clics (comportement modal, façon Instagram).
  return createPortal(
    <div
      className="inline-text"
      role="presentation"
      onPointerDown={(e) => {
        // Un tap hors du champ et hors de la barre valide le texte.
        if (e.target === e.currentTarget) submit();
      }}
    >
      <div className="inline-text__bar">
        <button
          type="button"
          className="inline-text__bar-btn"
          onClick={onCancel}
          aria-label="Annuler"
        >
          ✕
        </button>
        <span className="inline-text__bar-title">Texte</span>
        <button
          type="button"
          className="inline-text__bar-btn inline-text__bar-btn--done"
          onClick={submit}
        >
          Terminé
        </button>
      </div>

      <textarea
        ref={fieldRef}
        className="inline-text__field"
        style={{
          left: pos.x,
          top: pos.y,
          color,
          fontSize,
        }}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          resizeField(e.target);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Écrire…"
        rows={1}
        autoComplete="off"
        autoCorrect="on"
        spellCheck
        enterKeyHint="done"
      />
    </div>,
    document.body,
  );
}
