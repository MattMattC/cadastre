import type { Parcelle, PolygonRings } from "../types";

const API_CARTO_PARCELLE = "https://apicarto.ign.fr/api/cadastre/parcelle";

interface ParcelleProperties {
  idu?: string;
  section?: string;
  numero?: string;
  nom_com?: string;
  code_insee?: string;
  contenance?: number;
}

interface ParcelleFeature {
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: ParcelleProperties;
}

interface ParcelleResponse {
  features?: ParcelleFeature[];
}

// Aplati une géométrie Polygon/MultiPolygon en une liste d'anneaux [lon,lat].
function toRings(geometry: ParcelleFeature["geometry"]): PolygonRings {
  if (geometry.type === "Polygon") {
    return geometry.coordinates as number[][][];
  }
  // MultiPolygon : on concatène les anneaux de chaque polygone.
  return (geometry.coordinates as number[][][][]).flat();
}

// Calcule l'emprise [[south, west], [north, east]] à partir des anneaux.
function computeBounds(
  rings: PolygonRings,
): [[number, number], [number, number]] {
  let minLat = Infinity;
  let minLon = Infinity;
  let maxLat = -Infinity;
  let maxLon = -Infinity;

  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }
  }

  return [
    [minLat, minLon],
    [maxLat, maxLon],
  ];
}

/**
 * Identifie la parcelle cadastrale située sous un point (clic carte).
 * Renvoie null si aucune parcelle n'intersecte le point.
 */
export async function getParcelleAtPoint(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<Parcelle | null> {
  const geom = JSON.stringify({ type: "Point", coordinates: [lon, lat] });
  const url = `${API_CARTO_PARCELLE}?geom=${encodeURIComponent(geom)}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`API cadastre indisponible (HTTP ${res.status})`);
  }

  const data = (await res.json()) as ParcelleResponse;
  const feature = data.features?.[0];
  if (!feature?.geometry) return null;

  const rings = toRings(feature.geometry);
  if (rings.length === 0) return null;

  const props = feature.properties ?? {};
  return {
    id: props.idu ?? `${props.section ?? "?"}-${props.numero ?? "?"}`,
    section: props.section ?? "?",
    numero: props.numero ?? "?",
    commune: props.nom_com ?? "",
    codeInsee: props.code_insee ?? "",
    surface: props.contenance,
    rings,
    bounds: computeBounds(rings),
  };
}
