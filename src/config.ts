// Centralisation des endpoints publics (Géoplateforme IGN) et des couches carto.
// Toutes ces ressources sont gratuites et sous Licence Ouverte 2.0.
// Source des données : IGN / DGFiP — https://cadastre.data.gouv.fr

export const GEOPLATEFORME = {
  completion: "https://data.geopf.fr/geocodage/completion/",
  search: "https://data.geopf.fr/geocodage/search",
  reverse: "https://data.geopf.fr/geocodage/reverse",
} as const;

// Fonds de carte (couches de base, une seule active à la fois).
export const BASE_LAYERS = {
  osm: {
    label: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  },
  ignPlan: {
    label: "IGN Plan",
    url:
      "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
      "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png" +
      "&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    attribution: "© IGN — Géoplateforme",
    maxZoom: 19,
  },
  ignPhoto: {
    label: "IGN Photo aérienne",
    url:
      "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
      "&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg" +
      "&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    attribution: "© IGN — Géoplateforme",
    maxZoom: 19,
  },
} as const;

export type BaseLayerKey = keyof typeof BASE_LAYERS;

// Styles de tuiles vectorielles IGN (nets à n'importe quel zoom).
export const VECTOR_STYLES = {
  ignPlan:
    "https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json",
} as const;

// Couche cadastre superposable (overlay raster WMTS, Parcellaire Express).
export const CADASTRE_OVERLAY = {
  label: "Cadastre (parcelles)",
  url:
    "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
    "&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&FORMAT=image/png" +
    "&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
  attribution: "© IGN / DGFiP — Parcellaire Express (PCI)",
  maxZoom: 19,
} as const;

// Vue par défaut : France métropolitaine.
export const DEFAULT_VIEW = {
  center: [46.6, 2.4] as [number, number],
  zoom: 6,
};

// Zoom appliqué quand on sélectionne une adresse précise.
export const ADDRESS_ZOOM = 18;
