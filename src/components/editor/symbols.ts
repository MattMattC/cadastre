// Palette de symboles pour annoter un plan d'assainissement / réseaux.
// Trois types de rendu :
//  - "svg"   : pictogramme dessiné (rendu comme image sur le canvas Konva) ;
//  - "text"  : libellé court coloré (rendu comme texte Konva) ;
//  - "emoji" : symbole générique (rendu comme texte Konva).
export type SymbolKind = "svg" | "text" | "emoji";

export type SymbolCategory =
  | "regards"
  | "equipements"
  | "appareils"
  | "reperes";

export interface SymbolDef {
  id: string;
  label: string;
  kind: SymbolKind;
  category: SymbolCategory;
  svg?: string; // markup SVG (viewBox 0 0 32 32) si kind === "svg"
  text?: string; // libellé/emoji si kind === "text" | "emoji"
  color?: string; // couleur du texte si kind === "text"
}

// Catégories ordonnées pour l'affichage de la légende.
export const CATEGORIES: { id: SymbolCategory; label: string }[] = [
  { id: "regards", label: "Regards / boîtes" },
  { id: "equipements", label: "Équipements" },
  { id: "appareils", label: "Appareils sanitaires" },
  { id: "reperes", label: "Repères" },
];

// Palette de couleurs cohérente avec la légende source.
const C = {
  red: "#d62828",
  green: "#2f9e44",
  blue: "#1b6ec2",
  grey: "#8a8a8a",
  dark: "#2b2b2b",
};

const wrap = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${inner}</svg>`;

const label = (t: string, c: string, size = 12) =>
  `<text x="16" y="16.5" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="700" fill="${c}" text-anchor="middle" dominant-baseline="central">${t}</text>`;

// --- Builders de pictogrammes -------------------------------------------
const circleLetter = (t: string, c: string) =>
  wrap(
    `<circle cx="16" cy="16" r="13" fill="#fff" stroke="${c}" stroke-width="2"/>${label(
      t,
      c,
      t.length > 1 ? 10 : 13,
    )}`,
  );

const squareLetter = (t: string, c: string) =>
  wrap(
    `<rect x="3" y="3" width="26" height="26" rx="3" fill="#fff" stroke="${c}" stroke-width="2"/>${label(
      t,
      c,
      t.length > 1 ? 10 : 13,
    )}`,
  );

const squareOutline = (c: string) =>
  wrap(`<rect x="3" y="3" width="26" height="26" rx="2" fill="#fff" stroke="${c}" stroke-width="2.4"/>`);

const circleOutline = (c: string) =>
  wrap(`<circle cx="16" cy="16" r="12" fill="#fff" stroke="${c}" stroke-width="2.4"/>`);

const filledSquare = (c: string) =>
  wrap(`<rect x="4" y="4" width="24" height="24" rx="2" fill="${c}"/>`);

const filledCircle = (c: string) => wrap(`<circle cx="16" cy="16" r="12" fill="${c}"/>`);

const crossedCircle = (c: string) =>
  wrap(
    `<circle cx="16" cy="16" r="12" fill="#fff" stroke="${c}" stroke-width="2.4"/><path d="M8 8 L24 24 M24 8 L8 24" stroke="${c}" stroke-width="2.4"/>`,
  );

const squareWithCircle = (c: string) =>
  wrap(
    `<rect x="3" y="3" width="26" height="26" rx="2" fill="#fff" stroke="${c}" stroke-width="2"/><circle cx="16" cy="16" r="6" fill="none" stroke="${c}" stroke-width="2"/>`,
  );

const diamondLetter = (t: string, c: string) =>
  wrap(
    `<rect x="8" y="8" width="16" height="16" rx="1.5" transform="rotate(45 16 16)" fill="#fff" stroke="${c}" stroke-width="2"/>${label(
      t,
      c,
      11,
    )}`,
  );

const hatchedSquare = (c: string) =>
  wrap(
    `<defs><pattern id="h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${c}" stroke-width="1.6"/></pattern></defs><rect x="3" y="3" width="26" height="26" fill="url(#h)" stroke="${c}" stroke-width="2"/>`,
  );

const barsRect = (c: string) =>
  wrap(
    `<rect x="3" y="9" width="26" height="14" fill="#fff" stroke="${c}" stroke-width="2"/><path d="M8 9V23 M13 9V23 M18 9V23 M23 9V23" stroke="${c}" stroke-width="1.4"/>`,
  );

const cellsRect = (c: string) =>
  wrap(
    `<rect x="3" y="10" width="26" height="12" fill="#fff" stroke="${c}" stroke-width="2"/><path d="M11.5 10V22 M20.5 10V22" stroke="${c}" stroke-width="1.8"/>`,
  );

const halfCircleBars = (c: string) =>
  wrap(
    `<path d="M4 21 A12 12 0 0 1 28 21 Z" fill="#fff" stroke="${c}" stroke-width="2"/><path d="M10 21V13 M16 21V10 M22 21V13" stroke="${c}" stroke-width="1.4"/>`,
  );

const pump = (c: string) =>
  wrap(
    `<circle cx="16" cy="16" r="12" fill="#fff" stroke="${c}" stroke-width="2"/><path d="M10 21 C 10 12, 22 21, 22 12" fill="none" stroke="${c}" stroke-width="2"/><path d="M22 12 l-3.5 1 l1 -3.6 z" fill="${c}"/>`,
  );

const filledEllipse = (c: string) =>
  wrap(`<ellipse cx="16" cy="16" rx="13" ry="8" fill="${c}"/>`);

const collector = (c: string) =>
  wrap(
    `<line x1="2" y1="16" x2="30" y2="16" stroke="${c}" stroke-width="2.4"/><circle cx="16" cy="16" r="5.5" fill="#fff" stroke="${c}" stroke-width="2"/>`,
  );

const photo = () =>
  wrap(
    `<rect x="3" y="7" width="26" height="18" rx="2" fill="#fff" stroke="${C.grey}" stroke-width="2"/><circle cx="10" cy="13" r="2.2" fill="${C.grey}"/><path d="M5 24 L13 15 L19 21 L23 17 L27 24 Z" fill="${C.grey}"/>`,
  );

const checkValve = () =>
  wrap(
    `<line x1="2" y1="16" x2="30" y2="16" stroke="${C.dark}" stroke-width="2"/><path d="M12 9 L12 23 L22 16 Z" fill="#fff" stroke="${C.dark}" stroke-width="2"/><line x1="22" y1="9" x2="22" y2="23" stroke="${C.dark}" stroke-width="2"/>`,
  );

// --- La palette ----------------------------------------------------------
export const SYMBOLS: SymbolDef[] = [
  // Regards / boîtes
  { id: "bb", kind: "svg", category: "regards", label: "Boîte branchement", svg: circleLetter("BB", C.red) },
  { id: "regard-eu", kind: "svg", category: "regards", label: "Regard EU", svg: squareOutline(C.red) },
  { id: "regard-ep", kind: "svg", category: "regards", label: "Regard EP", svg: squareOutline(C.green) },
  {
    id: "regard-eu-inaccessible",
    kind: "svg",
    category: "regards",
    label: "Regard EU inaccessible",
    svg: hatchedSquare(C.red),
  },
  { id: "regard-reseau", kind: "svg", category: "regards", label: "Regard réseau", svg: circleOutline(C.grey) },
  {
    id: "regard-pluvial",
    kind: "svg",
    category: "regards",
    label: "Regard pluvial",
    svg: squareWithCircle(C.green),
  },
  { id: "fs", kind: "svg", category: "regards", label: "FS", svg: squareWithCircle(C.red) },

  // Équipements
  { id: "pompe", kind: "svg", category: "equipements", label: "Pompe de refoulement", svg: pump(C.red) },
  { id: "bac-degraisseur", kind: "svg", category: "equipements", label: "Bac dégraisseur", svg: cellsRect(C.red) },
  { id: "bac-recup", kind: "svg", category: "equipements", label: "Bac de récupération", svg: filledSquare(C.green) },
  { id: "puisard", kind: "svg", category: "equipements", label: "Puisard pluvial", svg: circleLetter("P", C.green) },
  { id: "siphon-sol", kind: "svg", category: "equipements", label: "Siphon de sol", svg: crossedCircle(C.green) },
  { id: "siphon-eu", kind: "svg", category: "equipements", label: "Siphon EU", svg: diamondLetter("S", C.red) },
  { id: "te-curage", kind: "svg", category: "equipements", label: "Té de curage", svg: circleLetter("T", C.red) },
  { id: "gouttiere", kind: "svg", category: "equipements", label: "Gouttière", svg: filledCircle(C.green) },
  { id: "avaloir", kind: "svg", category: "equipements", label: "Avaloir", svg: halfCircleBars(C.green) },
  { id: "grille-ep", kind: "svg", category: "equipements", label: "Grille EP", svg: barsRect(C.green) },
  { id: "grille-garage", kind: "svg", category: "equipements", label: "Grille desc. garage", svg: barsRect(C.grey) },
  { id: "collecteur-eu", kind: "svg", category: "equipements", label: "Collecteur EU domaine public", svg: collector(C.red) },
  { id: "clapet", kind: "svg", category: "equipements", label: "Clapet de non-retour", svg: checkValve() },
  { id: "marre", kind: "svg", category: "equipements", label: "Mare", svg: filledEllipse(C.blue) },
  { id: "photo", kind: "svg", category: "equipements", label: "Insertion photo", svg: photo() },

  // Appareils sanitaires (libellés)
  { id: "em", kind: "svg", category: "appareils", label: "Eaux ménagères", svg: squareLetter("EM", C.red) },
  { id: "ll", kind: "svg", category: "appareils", label: "Lave-linge", svg: squareLetter("LL", C.red) },
  { id: "lv", kind: "svg", category: "appareils", label: "Lave-vaisselle", svg: squareLetter("LV", C.red) },
  { id: "wc", kind: "text", category: "appareils", label: "WC", text: "WC", color: C.red },
  { id: "evier", kind: "text", category: "appareils", label: "Évier", text: "Évier", color: C.red },
  { id: "sdb", kind: "text", category: "appareils", label: "SdB", text: "SdB", color: C.red },
  { id: "cuisine", kind: "text", category: "appareils", label: "Cuisine", text: "cuisine", color: C.red },
  { id: "douche", kind: "text", category: "appareils", label: "Douche", text: "Douche", color: C.red },
  { id: "lavabo", kind: "text", category: "appareils", label: "Lavabo", text: "Lavabo", color: C.red },
  { id: "baignoire", kind: "text", category: "appareils", label: "Baignoire", text: "Baignoire", color: C.red },
  { id: "bidet", kind: "text", category: "appareils", label: "Bidet", text: "Bidet", color: C.red },

  // Repères génériques
  { id: "repere", kind: "emoji", category: "reperes", label: "Repère", text: "📍" },
  { id: "nord", kind: "emoji", category: "reperes", label: "Nord", text: "🧭" },
  { id: "danger", kind: "emoji", category: "reperes", label: "Danger", text: "⚠️" },
  { id: "arbre", kind: "emoji", category: "reperes", label: "Arbre", text: "🌳" },
  { id: "batiment", kind: "emoji", category: "reperes", label: "Bâtiment", text: "🏠" },
];

export function getSymbol(id: string): SymbolDef | undefined {
  return SYMBOLS.find((s) => s.id === id);
}

export function svgToDataUrl(svg: string): string {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
