// Palette de symboles pour annoter un plan d'assainissement / réseaux.
// Trois types de rendu :
//  - "svg"   : pictogramme dessiné (rendu comme image sur le canvas Konva) ;
//  - "text"  : libellé court coloré (rendu comme texte Konva) ;
//  - "emoji" : symbole générique (rendu comme texte Konva).
export type SymbolKind = "svg" | "text" | "emoji";

export interface SymbolDef {
  id: string;
  label: string;
  kind: SymbolKind;
  svg?: string; // markup SVG (viewBox 0 0 32 32) si kind === "svg"
  text?: string; // libellé/emoji si kind === "text" | "emoji"
  color?: string; // couleur du texte si kind === "text"
}

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

interface LineOpts {
  dash?: string;
  arrow?: boolean;
  dots?: boolean;
  tick?: boolean;
}

const lineIcon = (c: string, opts: LineOpts = {}) => {
  const stroke = opts.dots
    ? 'stroke-dasharray="1.5 4"'
    : opts.dash
      ? `stroke-dasharray="${opts.dash}"`
      : "";
  const x2 = opts.arrow ? 23 : 30;
  const head = opts.arrow ? `<path d="M30 16 l-8 -4.5 v9 z" fill="${c}"/>` : "";
  const tick = opts.tick
    ? `<line x1="16" y1="10" x2="16" y2="22" stroke="${c}" stroke-width="2.4"/>`
    : "";
  return wrap(
    `<line x1="2" y1="16" x2="${x2}" y2="16" stroke="${c}" stroke-width="3" ${stroke} stroke-linecap="round"/>${head}${tick}`,
  );
};

// --- La palette ----------------------------------------------------------
export const SYMBOLS: SymbolDef[] = [
  // Regards / boîtes
  { id: "bb", kind: "svg", label: "Boîte branchement", svg: circleLetter("BB", C.red) },
  { id: "regard-eu", kind: "svg", label: "Regard EU", svg: squareOutline(C.red) },
  { id: "regard-ep", kind: "svg", label: "Regard EP", svg: squareOutline(C.green) },
  {
    id: "regard-eu-inaccessible",
    kind: "svg",
    label: "Regard EU inaccessible",
    svg: hatchedSquare(C.red),
  },
  { id: "regard-reseau", kind: "svg", label: "Regard réseau", svg: circleOutline(C.grey) },
  {
    id: "regard-pluvial",
    kind: "svg",
    label: "Regard pluvial",
    svg: squareWithCircle(C.green),
  },
  { id: "fs", kind: "svg", label: "FS", svg: squareWithCircle(C.red) },

  // Équipements
  { id: "pompe", kind: "svg", label: "Pompe de refoulement", svg: pump(C.red) },
  { id: "bac-degraisseur", kind: "svg", label: "Bac dégraisseur", svg: cellsRect(C.red) },
  { id: "bac-recup", kind: "svg", label: "Bac de récupération", svg: filledSquare(C.green) },
  { id: "puisard", kind: "svg", label: "Puisard pluvial", svg: circleLetter("P", C.green) },
  { id: "siphon-sol", kind: "svg", label: "Siphon de sol", svg: crossedCircle(C.green) },
  { id: "siphon-eu", kind: "svg", label: "Siphon EU", svg: diamondLetter("S", C.red) },
  { id: "te-curage", kind: "svg", label: "Té de curage", svg: circleLetter("T", C.red) },
  { id: "gouttiere", kind: "svg", label: "Gouttière", svg: filledCircle(C.green) },
  { id: "avaloir", kind: "svg", label: "Avaloir", svg: halfCircleBars(C.green) },
  { id: "grille-ep", kind: "svg", label: "Grille EP", svg: barsRect(C.green) },
  { id: "grille-garage", kind: "svg", label: "Grille desc. garage", svg: barsRect(C.grey) },
  { id: "collecteur-eu", kind: "svg", label: "Collecteur EU domaine public", svg: collector(C.red) },
  { id: "clapet", kind: "svg", label: "Clapet de non-retour", svg: checkValve() },
  { id: "marre", kind: "svg", label: "Mare", svg: filledEllipse(C.blue) },
  { id: "photo", kind: "svg", label: "Insertion photo", svg: photo() },

  // Appareils sanitaires (libellés)
  { id: "em", kind: "svg", label: "Eaux ménagères", svg: squareLetter("EM", C.red) },
  { id: "ll", kind: "svg", label: "Lave-linge", svg: squareLetter("LL", C.red) },
  { id: "lv", kind: "svg", label: "Lave-vaisselle", svg: squareLetter("LV", C.red) },
  { id: "wc", kind: "text", label: "WC", text: "WC", color: C.red },
  { id: "evier", kind: "text", label: "Évier", text: "Évier", color: C.red },
  { id: "sdb", kind: "text", label: "SdB", text: "SdB", color: C.red },
  { id: "cuisine", kind: "text", label: "Cuisine", text: "cuisine", color: C.red },
  { id: "douche", kind: "text", label: "Douche", text: "Douche", color: C.red },
  { id: "lavabo", kind: "text", label: "Lavabo", text: "Lavabo", color: C.red },
  { id: "baignoire", kind: "text", label: "Baignoire", text: "Baignoire", color: C.red },
  { id: "bidet", kind: "text", label: "Bidet", text: "Bidet", color: C.red },

  // Réseaux / canalisations (traits)
  { id: "cana-eu", kind: "svg", label: "cana EU", svg: lineIcon(C.red) },
  { id: "cana-ep", kind: "svg", label: "cana EP", svg: lineIcon(C.blue) },
  { id: "cana-privee", kind: "svg", label: "cana privée", svg: lineIcon(C.grey, { dots: true }) },
  { id: "reseau-eu", kind: "svg", label: "réseau EU", svg: lineIcon(C.red, { arrow: true }) },
  { id: "reseau-unitaire", kind: "svg", label: "réseau unitaire", svg: lineIcon(C.green) },
  {
    id: "branchement-unitaire",
    kind: "svg",
    label: "branchement unitaire",
    svg: lineIcon(C.green, { tick: true }),
  },
  { id: "ep-fil-eau", kind: "svg", label: "EP fil d'eau", svg: lineIcon(C.blue) },
  {
    id: "ep-infiltration",
    kind: "svg",
    label: "EP infiltration",
    svg: lineIcon(C.blue, { dash: "5 4", arrow: true }),
  },
  { id: "master15", kind: "svg", label: "Master.15", svg: lineIcon(C.green, { dash: "5 4" }) },

  // Repères génériques
  { id: "repere", kind: "emoji", label: "Repère", text: "📍" },
  { id: "nord", kind: "emoji", label: "Nord", text: "🧭" },
  { id: "danger", kind: "emoji", label: "Danger", text: "⚠️" },
  { id: "arbre", kind: "emoji", label: "Arbre", text: "🌳" },
  { id: "batiment", kind: "emoji", label: "Bâtiment", text: "🏠" },
];

export function getSymbol(id: string): SymbolDef | undefined {
  return SYMBOLS.find((s) => s.id === id);
}

export function svgToDataUrl(svg: string): string {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
