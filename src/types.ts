// Une suggestion d'adresse normalisée pour l'UI.
export interface AddressSuggestion {
  // Identifiant local stable (pour les listes React).
  id: string;
  // Libellé affiché à l'utilisateur.
  label: string;
  // Coordonnées WGS84.
  lat: number;
  lon: number;
  // Type renvoyé par l'API (StreetAddress, PositionOfInterest...).
  kind: string;
  // Code INSEE de la commune (utile pour charger le cadastre plus tard).
  citycode?: string;
  zipcode?: string;
  city?: string;
}

// Coordonnées GeoJSON d'un polygone (anneaux de [lon, lat]).
export type PolygonRings = number[][][];

// Une parcelle cadastrale sélectionnée (issue de l'API Carto).
export interface Parcelle {
  // Identifiant unique de la parcelle (idu).
  id: string;
  section: string;
  numero: string;
  commune: string; // nom_com
  codeInsee: string;
  surface?: number; // contenance en m²
  // Géométrie du contour (Polygon ou MultiPolygon aplati en anneaux).
  rings: PolygonRings;
  // Emprise [southWest, northEast] en [lat, lon] pour le cadrage carte.
  bounds: [[number, number], [number, number]];
}

// Fonds de carte utilisables comme arrière-plan de l'éditeur.
export type EditorBaseLayer = "ignPlan" | "ignPhoto";

// Un outil de dessin (« select » et « pan » ne créent pas de forme).
export type ToolKind =
  | "select"
  | "pan"
  | "eraser"
  | "pen"
  | "line"
  | "rect"
  | "ellipse"
  | "text"
  | "symbol";

// Coordonnée géographique [latitude, longitude].
export type LatLng = [number, number];

// Type de forme effectivement dessinable.
// Têtes de flèche d'un trait : aucune, à l'arrivée, ou aux deux extrémités.
export type LineArrows = "none" | "end" | "both";

// "arrow" : ancien type de forme (projets enregistrés), rendu comme un trait
// avec `arrows: "end"`. Les nouveaux traits utilisent `type: "line"`.
export type ShapeType = Exclude<ToolKind, "select" | "pan" | "eraser"> | "arrow";

// Une forme dessinée, ancrée en coordonnées géographiques pour suivre
// le zoom/déplacement de la carte. Les tailles (épaisseur, police, symbole)
// sont exprimées en pixels au zoom de référence `baseZoom`, puis mises à
// l'échelle 2^(zoom - baseZoom) pour rester collées au terrain.
export interface Shape {
  id: string;
  type: ShapeType;
  color: string;
  strokeWidth: number;
  // Trait : pointillé et têtes de flèche.
  dashed?: boolean;
  arrows?: LineArrows;
  // Zoom carte au moment de la création (référence d'échelle).
  baseZoom?: number;
  // Bearing carte à la création (référence d'orientation).
  baseBearing?: number;
  // pen / line / arrow : liste de sommets ; rect / ellipse : 2 coins opposés.
  latlngs?: LatLng[];
  // text / symbol : position d'ancrage.
  latlng?: LatLng;
  text?: string;
  fontSize?: number;
  rotation?: number;
  // symbol : identifiant du pictogramme (voir SYMBOLS) et taille écran en px.
  symbolId?: string;
  size?: number;
}

// Vue carte sauvegardée pour restaurer le cadrage.
export interface SavedView {
  center: LatLng;
  zoom: number;
  bearing?: number;
}

// Un projet d'annotation sauvegardé (rééditable).
export interface AnnotationProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** @deprecated Préférer `parcelles` */
  parcelle?: Parcelle;
  parcelles: Parcelle[];
  baseLayer: EditorBaseLayer;
  showCadastre: boolean;
  shapes: Shape[];
  view?: SavedView;
}
