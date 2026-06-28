// Palette de symboles utiles pour annoter un plan cadastral.
export interface SymbolDef {
  char: string;
  label: string;
}

export const SYMBOLS: SymbolDef[] = [
  { char: "📍", label: "Repère" },
  { char: "🚪", label: "Entrée / porte" },
  { char: "🅿️", label: "Stationnement" },
  { char: "⚠️", label: "Danger" },
  { char: "💧", label: "Eau" },
  { char: "⚡", label: "Électricité" },
  { char: "🔥", label: "Gaz / feu" },
  { char: "🌳", label: "Arbre" },
  { char: "🧭", label: "Nord" },
  { char: "🏠", label: "Bâtiment" },
  { char: "★", label: "Étoile" },
  { char: "✚", label: "Croix" },
];
