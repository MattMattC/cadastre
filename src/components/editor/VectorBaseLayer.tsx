import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "@maplibre/maplibre-gl-leaflet";
import "maplibre-gl/dist/maplibre-gl.css";

interface Props {
  styleUrl: string;
}

// Affiche un fond en tuiles vectorielles (MapLibre GL) synchronisé avec Leaflet.
// Rendu net à tout niveau de zoom, contrairement aux tuiles raster.
export default function VectorBaseLayer({ styleUrl }: Props) {
  const map = useMap();

  useEffect(() => {
    // `preserveDrawingBuffer` est une option MapLibre valide (capture du canvas
    // WebGL pour l'export PNG) mais absente du typage du plugin Leaflet.
    const options = { style: styleUrl, preserveDrawingBuffer: true };
    const gl = L.maplibreGL(options as Parameters<typeof L.maplibreGL>[0]);
    gl.addTo(map);
    return () => {
      map.removeLayer(gl);
    };
  }, [map, styleUrl]);

  return null;
}
