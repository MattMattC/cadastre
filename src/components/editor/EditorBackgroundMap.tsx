import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
import { BASE_LAYERS, CADASTRE_OVERLAY, VECTOR_STYLES } from "../../config";
import VectorBaseLayer from "./VectorBaseLayer";
import type { EditorBaseLayer, Parcelle, SavedView } from "../../types";

interface Props {
  parcelle: Parcelle;
  baseLayer: EditorBaseLayer;
  showCadastre: boolean;
  initialView?: SavedView;
  onMap: (map: L.Map) => void;
}

// Récupère l'instance Leaflet, cadre sur la parcelle et notifie le parent.
function MapBridge({
  bounds,
  initialView,
  onMap,
}: {
  bounds: Parcelle["bounds"];
  initialView?: SavedView;
  onMap: (map: L.Map) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (initialView) {
      map.setView(initialView.center, initialView.zoom);
    } else {
      // Cadrage serré pour que la parcelle remplisse la fenêtre.
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [24, 24] });
    }
    onMap(map);
  }, [map, bounds, initialView, onMap]);

  return null;
}

export default function EditorBackgroundMap({
  parcelle,
  baseLayer,
  showCadastre,
  initialView,
  onMap,
}: Props) {
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
      minZoom={5}
      maxZoom={22}
      zoomControl={false}
      attributionControl={false}
      zoomSnap={0.25}
      style={{ height: "100%", width: "100%" }}
    >
      {baseLayer === "ignPlan" ? (
        <VectorBaseLayer styleUrl={VECTOR_STYLES.ignPlan} />
      ) : (
        <TileLayer
          url={BASE_LAYERS.ignPhoto.url}
          maxZoom={22}
          maxNativeZoom={20}
          crossOrigin="anonymous"
        />
      )}
      {showCadastre && (
        <TileLayer
          url={CADASTRE_OVERLAY.url}
          maxZoom={22}
          maxNativeZoom={19}
          crossOrigin="anonymous"
        />
      )}
      <Polygon
        positions={polygonPositions}
        pathOptions={{
          color: "#d62828",
          weight: 2,
          fillColor: "#d62828",
          fillOpacity: 0.06,
        }}
      />
      <MapBridge bounds={parcelle.bounds} initialView={initialView} onMap={onMap} />
    </MapContainer>
  );
}
