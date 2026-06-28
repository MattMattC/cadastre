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
