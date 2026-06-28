import { GEOPLATEFORME } from "../config";
import type { AddressSuggestion } from "../types";

// Forme partielle d'un résultat de l'API d'autocomplétion Géoplateforme.
interface CompletionResult {
  fulltext?: string;
  x?: number; // longitude (WGS84)
  y?: number; // latitude (WGS84)
  kind?: string;
  classification?: number;
  country?: string;
  city?: string;
  citycode?: string;
  zipcode?: string;
  zipcodes?: string[];
}

interface CompletionResponse {
  status?: string;
  results?: CompletionResult[];
}

export interface CompletionOptions {
  // Limite la recherche à un ou plusieurs départements (ex. "27").
  depcode?: string;
  // Nombre maximum de suggestions (1–15).
  maximumResponses?: number;
  // Permet d'annuler une requête obsolète (debounce / frappe rapide).
  signal?: AbortSignal;
}

/**
 * Interroge l'API d'autocomplétion de la Géoplateforme.
 * Renvoie des suggestions normalisées (adresses + points d'intérêt).
 */
export async function completeAddress(
  text: string,
  options: CompletionOptions = {},
): Promise<AddressSuggestion[]> {
  const trimmed = text.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    text: trimmed,
    type: "StreetAddress,PositionOfInterest",
    maximumResponses: String(options.maximumResponses ?? 8),
  });
  if (options.depcode) params.set("depcode", options.depcode);

  const url = `${GEOPLATEFORME.completion}?${params.toString()}`;
  const res = await fetch(url, { signal: options.signal });
  if (!res.ok) {
    throw new Error(`Autocomplétion indisponible (HTTP ${res.status})`);
  }

  const data = (await res.json()) as CompletionResponse;
  const results = data.results ?? [];

  return results
    .filter((r) => typeof r.x === "number" && typeof r.y === "number")
    .map((r, index) => ({
      id: `${r.citycode ?? "?"}-${r.fulltext ?? index}-${index}`,
      label: r.fulltext ?? "Adresse inconnue",
      lat: r.y as number,
      lon: r.x as number,
      kind: r.kind ?? r.country ?? "inconnu",
      citycode: r.citycode,
      zipcode: r.zipcode ?? r.zipcodes?.[0],
      city: r.city,
    }));
}
