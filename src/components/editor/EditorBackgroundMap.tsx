import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
import { BASE_LAYERS, CADASTRE_OVERLAY } from "../../config";
import type { EditorBaseLayer, Parcelle } from "../../types";

interface Props {
  parcelle: Parcelle;
  baseLayer: EditorBaseLayer;
  showCadastre: boolean;
}

// Verrouille la carte (aucune interaction) et cadre sur la parcelle.
function LockAndFit({ bounds }: { bounds: Parcelle["bounds"] }) {
  const map = useMap();

  useEffect(() => {
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] });
  }, [map, bounds]);

  return null;
}

export default function EditorBackgroundMap({
  parcelle,
  baseLayer,
  showCadastre,
}: Props) {
  const layer = BASE_LAYERS[baseLayer];

  const polygonPositions = useMemo(
    () =>
      parcelle.rings.map((ring) =>
        ring.map(([lon, lat]) => [lat, lon] as [number, number]),
      ),
    [parcelle],
  );

  const center = useMemo<[number, number]>(() => {
    const [[s, w], [n, e]] = parcelle.bounds;
    return [(s + n) / 2, (w + e) / 2];
  }, [parcelle]);

  return (
    <MapContainer
      center={center}
      zoom={18}
      zoomControl={false}
      attributionControl={false}
      // `crossOrigin` permet l'export d'image sans canvas « tainted ».
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer url={layer.url} maxZoom={layer.maxZoom} crossOrigin="anonymous" />
      {showCadastre && (
        <TileLayer
          url={CADASTRE_OVERLAY.url}
          maxZoom={CADASTRE_OVERLAY.maxZoom}
          crossOrigin="anonymous"
        />
      )}
      <Polygon
        positions={polygonPositions}
        pathOptions={{
          color: "#d62828",
          weight: 2,
          fillColor: "#d62828",
          fillOpacity: 0.08,
        }}
      />
      <LockAndFit bounds={parcelle.bounds} />
    </MapContainer>
  );
}
