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

// Un outil de dessin.
export type ToolKind =
  | "select"
  | "pen"
  | "line"
  | "arrow"
  | "rect"
  | "ellipse"
  | "text"
  | "symbol";

// Une forme dessinée dans l'éditeur (espace pixel du canvas).
export interface Shape {
  id: string;
  type: Exclude<ToolKind, "select">;
  color: string;
  strokeWidth: number;
  // Tracés (pen / line / arrow) : liste de points [x1,y1,x2,y2,...].
  points?: number[];
  // Formes positionnées (rect / ellipse / text / symbol).
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // Contenu pour text / symbol.
  text?: string;
  fontSize?: number;
  rotation?: number;
}

// Un projet d'annotation sauvegardé (rééditable).
export interface AnnotationProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  parcelle: Parcelle;
  baseLayer: EditorBaseLayer;
  showCadastre: boolean;
  shapes: Shape[];
}
