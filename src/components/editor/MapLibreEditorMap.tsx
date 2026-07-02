import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type {
  Map as MaplibreMap,
  MapOptions,
  StyleSpecification,
  LngLatBoundsLike,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BASE_LAYERS, CADASTRE_OVERLAY, VECTOR_STYLES } from "../../config";
import type { EditorBaseLayer, Parcelle, SavedView } from "../../types";

interface Props {
  parcelle: Parcelle;
  baseLayer: EditorBaseLayer;
  showCadastre: boolean;
  initialView?: SavedView;
  onMap: (map: MaplibreMap) => void;
}

// Style raster (photo aérienne) construit à la volée pour MapLibre.
function photoStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      ortho: {
        type: "raster",
        tiles: [BASE_LAYERS.ignPhoto.url],
        tileSize: 256,
        maxzoom: 20,
        attribution: BASE_LAYERS.ignPhoto.attribution,
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#dfe3e8" } },
      { id: "ortho", type: "raster", source: "ortho" },
    ],
  };
}

function styleFor(baseLayer: EditorBaseLayer): string | StyleSpecification {
  return baseLayer === "ignPlan" ? VECTOR_STYLES.ignPlan : photoStyle();
}

export default function MapLibreEditorMap({
  parcelle,
  baseLayer,
  showCadastre,
  initialView,
  onMap,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  // Refs pour éviter les fermetures obsolètes dans les écouteurs.
  const parcelleRef = useRef(parcelle);
  const showCadastreRef = useRef(showCadastre);
  parcelleRef.current = parcelle;
  showCadastreRef.current = showCadastre;

  // (Ré)ajoute le cadastre et le contour de parcelle après chaque chargement
  // de style (initial ou changement de fond).
  function addOverlays(map: MaplibreMap) {
    if (!map.getSource("cadastre")) {
      map.addSource("cadastre", {
        type: "raster",
        tiles: [CADASTRE_OVERLAY.url],
        tileSize: 256,
        maxzoom: 19,
        attribution: CADASTRE_OVERLAY.attribution,
      });
    }
    if (showCadastreRef.current && !map.getLayer("cadastre")) {
      map.addLayer({
        id: "cadastre",
        type: "raster",
        source: "cadastre",
        paint: { "raster-opacity": 0.9 },
      });
    }

    if (!map.getSource("parcelle")) {
      map.addSource("parcelle", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: parcelleRef.current.rings },
          properties: {},
        },
      });
    }
    if (!map.getLayer("parcelle-fill")) {
      map.addLayer({
        id: "parcelle-fill",
        type: "fill",
        source: "parcelle",
        paint: { "fill-color": "#d62828", "fill-opacity": 0.06 },
      });
    }
    if (!map.getLayer("parcelle-line")) {
      map.addLayer({
        id: "parcelle-line",
        type: "line",
        source: "parcelle",
        paint: { "line-color": "#d62828", "line-width": 2 },
      });
    }
  }

  // Création unique de la carte.
  useEffect(() => {
    if (!containerRef.current) return;
    // preserveDrawingBuffer est valide au runtime (capture du canvas WebGL
    // pour l'export) mais absent de certains typings → on contourne via objet.
    const options = {
      container: containerRef.current,
      style: styleFor(baseLayer),
      center: [
        (parcelle.bounds[0][1] + parcelle.bounds[1][1]) / 2,
        (parcelle.bounds[0][0] + parcelle.bounds[1][0]) / 2,
      ] as [number, number],
      zoom: 17,
      maxZoom: 24,
      attributionControl: false,
      preserveDrawingBuffer: true,
    };
    const map = new maplibregl.Map(options as unknown as MapOptions);
    mapRef.current = map;

    map.on("style.load", () => addOverlays(map));
    map.on("load", () => {
      if (initialView) {
        map.jumpTo({
          center: [initialView.center[1], initialView.center[0]],
          zoom: initialView.zoom,
          bearing: initialView.bearing ?? 0,
        });
      } else {
        const bounds: LngLatBoundsLike = [
          [parcelle.bounds[0][1], parcelle.bounds[0][0]],
          [parcelle.bounds[1][1], parcelle.bounds[1][0]],
        ];
        map.fitBounds(bounds, { padding: 30, animate: false });
      }
      onMap(map);
    });

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Changement de fond (plan vectoriel ↔ photo) : on recharge le style.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    map.setStyle(styleFor(baseLayer));
    // addOverlays est rappelé via l'écouteur 'style.load'.
  }, [baseLayer]);

  // Affichage/masquage du cadastre.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (showCadastre) {
      if (!map.getSource("cadastre")) {
        map.addSource("cadastre", {
          type: "raster",
          tiles: [CADASTRE_OVERLAY.url],
          tileSize: 256,
          maxzoom: 19,
        });
      }
      if (!map.getLayer("cadastre")) {
        map.addLayer(
          {
            id: "cadastre",
            type: "raster",
            source: "cadastre",
            paint: { "raster-opacity": 0.9 },
          },
          map.getLayer("parcelle-fill") ? "parcelle-fill" : undefined,
        );
      }
    } else if (map.getLayer("cadastre")) {
      map.removeLayer("cadastre");
    }
  }, [showCadastre]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
