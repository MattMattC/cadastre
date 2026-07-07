import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type {
  Map as MaplibreMap,
  StyleSpecification,
  LngLatBoundsLike,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BASE_LAYERS, CADASTRE_OVERLAY, VECTOR_STYLES } from "../../config";
import type { EditorBaseLayer, Parcelle, SavedView } from "../../types";
import { mergeBounds } from "../../services/cadastre";

interface Props {
  parcelles: Parcelle[];
  baseLayer: EditorBaseLayer;
  showCadastre: boolean;
  initialView?: SavedView;
  onMap: (map: MaplibreMap) => void;
}

function parcellesGeoJSON(parcelles: Parcelle[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: parcelles.flatMap((p) =>
      p.rings.map((ring) => ({
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [ring] },
        properties: { id: p.id },
      })),
    ),
  };
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
  parcelles,
  baseLayer,
  showCadastre,
  initialView,
  onMap,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const parcellesRef = useRef(parcelles);
  const showCadastreRef = useRef(showCadastre);
  parcellesRef.current = parcelles;
  showCadastreRef.current = showCadastre;
  const combinedBounds = mergeBounds(parcelles);

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
        data: parcellesGeoJSON(parcellesRef.current),
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
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleFor(baseLayer),
      center: [
        (combinedBounds[0][1] + combinedBounds[1][1]) / 2,
        (combinedBounds[0][0] + combinedBounds[1][0]) / 2,
      ],
      zoom: 17,
      maxZoom: 24,
      attributionControl: false,
      // MapLibre v5 : préserver le buffer WebGL pour pouvoir capturer le
      // canvas lors de l'export PNG (sinon le fond ressort vide).
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
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
          [combinedBounds[0][1], combinedBounds[0][0]],
          [combinedBounds[1][1], combinedBounds[1][0]],
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

  // Met à jour les contours quand la sélection de parcelles change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource("parcelle") as maplibregl.GeoJSONSource | undefined;
    source?.setData(parcellesGeoJSON(parcelles));
  }, [parcelles]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
