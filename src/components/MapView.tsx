import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  Marker,
  Popup,
  Polygon,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import {
  BASE_LAYERS,
  CADASTRE_OVERLAY,
  DEFAULT_VIEW,
  ADDRESS_ZOOM,
} from "../config";
import type { AddressSuggestion, Parcelle } from "../types";

// Corrige le chemin des icônes Leaflet quand on passe par un bundler (Vite).
const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface MapViewProps {
  selected: AddressSuggestion | null;
  parcelle: Parcelle | null;
  onMapClick: (lat: number, lon: number) => void;
}

// Recentre la carte quand une adresse est sélectionnée.
function FlyToSelection({ selected }: { selected: AddressSuggestion | null }) {
  const map = useMap();
  useEffect(() => {
    if (selected) {
      map.flyTo([selected.lat, selected.lon], ADDRESS_ZOOM, { duration: 1.2 });
    }
  }, [selected, map]);
  return null;
}

// Capture les clics sur la carte pour identifier la parcelle.
function ClickHandler({ onMapClick }: { onMapClick: MapViewProps["onMapClick"] }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapView({ selected, parcelle, onMapClick }: MapViewProps) {
  // Convertit les anneaux GeoJSON [lon,lat] en positions Leaflet [lat,lon].
  const polygonPositions = useMemo(() => {
    if (!parcelle) return null;
    return parcelle.rings.map((ring) =>
      ring.map(([lon, lat]) => [lat, lon] as [number, number]),
    );
  }, [parcelle]);

  return (
    <MapContainer
      center={DEFAULT_VIEW.center}
      zoom={DEFAULT_VIEW.zoom}
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
    >
      <LayersControl position="bottomright">
        <LayersControl.BaseLayer checked name={BASE_LAYERS.osm.label}>
          <TileLayer
            url={BASE_LAYERS.osm.url}
            attribution={BASE_LAYERS.osm.attribution}
            maxZoom={BASE_LAYERS.osm.maxZoom}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name={BASE_LAYERS.ignPlan.label}>
          <TileLayer
            url={BASE_LAYERS.ignPlan.url}
            attribution={BASE_LAYERS.ignPlan.attribution}
            maxZoom={BASE_LAYERS.ignPlan.maxZoom}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name={BASE_LAYERS.ignPhoto.label}>
          <TileLayer
            url={BASE_LAYERS.ignPhoto.url}
            attribution={BASE_LAYERS.ignPhoto.attribution}
            maxZoom={BASE_LAYERS.ignPhoto.maxZoom}
          />
        </LayersControl.BaseLayer>

        <LayersControl.Overlay checked name={CADASTRE_OVERLAY.label}>
          <TileLayer
            url={CADASTRE_OVERLAY.url}
            attribution={CADASTRE_OVERLAY.attribution}
            maxZoom={CADASTRE_OVERLAY.maxZoom}
          />
        </LayersControl.Overlay>
      </LayersControl>

      {selected && (
        <Marker position={[selected.lat, selected.lon]}>
          <Popup>{selected.label}</Popup>
        </Marker>
      )}

      {polygonPositions && (
        <Polygon
          positions={polygonPositions}
          pathOptions={{
            color: "#1b6ec2",
            weight: 2,
            fillColor: "#1b6ec2",
            fillOpacity: 0.25,
          }}
        />
      )}

      <ClickHandler onMapClick={onMapClick} />
      <FlyToSelection selected={selected} />
    </MapContainer>
  );
}
