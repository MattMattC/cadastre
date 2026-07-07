import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import type Konva from "konva";
import type { Map as MaplibreMap } from "maplibre-gl";
import MapLibreEditorMap from "../components/editor/MapLibreEditorMap";
import AnnotationCanvas from "../components/editor/AnnotationCanvas";
import Toolbar from "../components/editor/Toolbar";
import EditorControls from "../components/editor/EditorControls";
import { SYMBOLS } from "../components/editor/symbols";
import {
  getPendingParcelles,
  getProject,
  newId,
  projectParcelles,
  saveProject,
} from "../store/projects";
import type {
  AnnotationProject,
  EditorBaseLayer,
  LatLng,
  Parcelle,
  Shape,
  ToolKind,
} from "../types";
import "./EditorPage.css";

interface Pt {
  x: number;
  y: number;
}

export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectParam = searchParams.get("project");

  const initialProject = useMemo<AnnotationProject | null>(
    () => (projectParam ? getProject(projectParam) : null),
    [projectParam],
  );
  const initialParcelles = useMemo<Parcelle[]>(() => {
    if (initialProject) return projectParcelles(initialProject);
    return getPendingParcelles();
  }, [initialProject]);

  const [projectId, setProjectId] = useState<string | null>(
    initialProject?.id ?? null,
  );
  const [projectName, setProjectName] = useState<string>(
    initialProject?.name ?? "",
  );
  const [baseLayer, setBaseLayer] = useState<EditorBaseLayer>(
    initialProject?.baseLayer ?? "ignPlan",
  );
  const [showCadastre, setShowCadastre] = useState<boolean>(
    initialProject?.showCadastre ?? true,
  );

  const [shapes, setShapes] = useState<Shape[]>(initialProject?.shapes ?? []);
  const [past, setPast] = useState<Shape[][]>([]);
  const [tool, setTool] = useState<ToolKind>("pan");
  const [color, setColor] = useState("#d62828");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [currentSymbol, setCurrentSymbol] = useState(SYMBOLS[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTextRequestId, setEditTextRequestId] = useState<string | null>(null);
  const handleEditRequestHandled = useCallback(() => setEditTextRequestId(null), []);
  const handleEditSelectedText = useCallback(() => {
    if (selectedId) setEditTextRequestId(selectedId);
  }, [selectedId]);
  const [toast, setToast] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [mapReady, setMapReady] = useState(false);
  // Incrémenté à chaque déplacement/zoom pour reprojeter les annotations.
  const [, setViewVersion] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const mapRef = useRef<MaplibreMap | null>(null);

  const handleMap = useCallback((map: MaplibreMap) => {
    mapRef.current = map;
    // 'move' couvre déplacement, zoom et rotation (bearing).
    map.on("move", () => setViewVersion((v) => v + 1));
    // Rétrocompat : les formes créées avant l'échelle géo-ancrée n'ont pas
    // de zoom de référence ; on fige la vue d'ouverture comme référence.
    setShapes((prev) =>
      prev.map((s) =>
        s.baseZoom == null
          ? { ...s, baseZoom: map.getZoom(), baseBearing: map.getBearing() }
          : s,
      ),
    );
    setMapReady(true);
  }, []);

  const project = useCallback((ll: LatLng): Pt => {
    const p = mapRef.current!.project([ll[1], ll[0]]);
    return { x: p.x, y: p.y };
  }, []);

  const unproject = useCallback((p: Pt): LatLng => {
    const ll = mapRef.current!.unproject([p.x, p.y]);
    return [ll.lat, ll.lng];
  }, []);

  // Mesure la zone de dessin (responsive).
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setTool("pan");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, shapes, past]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  function commit(next: Shape[]) {
    setPast((p) => [...p, shapes]);
    setShapes(next);
  }

  function addShape(shape: Shape) {
    commit([...shapes, shape]);
  }

  function updateShape(id: string, patch: Partial<Shape>) {
    commit(shapes.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function deleteSelected() {
    if (!selectedId) return;
    commit(shapes.filter((s) => s.id !== selectedId));
    setSelectedId(null);
  }

  function clearAll() {
    if (shapes.length === 0) return;
    if (window.confirm("Effacer toutes les annotations ?")) {
      commit([]);
      setSelectedId(null);
    }
  }

  function undo() {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setShapes(previous);
    setPast((p) => p.slice(0, -1));
    setSelectedId(null);
  }

  function persist(id: string, name: string) {
    const now = Date.now();
    const map = mapRef.current;
    const projectData: AnnotationProject = {
      id,
      name,
      createdAt: initialProject?.createdAt ?? now,
      updatedAt: now,
      parcelles: initialParcelles,
      baseLayer,
      showCadastre,
      shapes,
      view: map
        ? {
            center: [map.getCenter().lat, map.getCenter().lng],
            zoom: map.getZoom(),
            bearing: map.getBearing(),
          }
        : undefined,
    };
    saveProject(projectData);
    setProjectId(id);
    setProjectName(name);
    setSearchParams({ project: id }, { replace: true });
  }

  function save() {
    if (!projectId) {
      saveAs();
      return;
    }
    persist(projectId, projectName);
    showToast("Projet enregistré.");
  }

  function saveAs() {
    const suggested =
      projectName ||
      (initialParcelles.length === 1
        ? `Parcelle ${initialParcelles[0].section} ${initialParcelles[0].numero}`
        : `${initialParcelles.length} parcelles`);
    const name = window.prompt("Nom du projet :", suggested);
    if (!name) return;
    persist(newId(), name);
    showToast("Projet enregistré sous « " + name + " ».");
  }

  async function exportPng() {
    const stage = stageRef.current;
    const map = mapRef.current;
    if (!stage || !map) return;
    setSelectedId(null);

    // Force un rendu frais de la carte puis attend la frame suivante.
    await new Promise<void>((resolve) => {
      map.once("idle", () => resolve());
      map.triggerRepaint();
      // Filet de sécurité si 'idle' ne se déclenche pas.
      window.setTimeout(() => resolve(), 600);
    });
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    try {
      const ratio = 2;
      const W = Math.round(size.width);
      const H = Math.round(size.height);
      const out = document.createElement("canvas");
      out.width = W * ratio;
      out.height = H * ratio;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("no 2d context");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);

      // 1. Fond complet (base + cadastre + contour) : un seul canvas WebGL.
      ctx.drawImage(map.getCanvas(), 0, 0, out.width, out.height);

      // 2. Annotations Konva par-dessus.
      const konvaCanvas = stage.toCanvas({ pixelRatio: ratio });
      ctx.drawImage(konvaCanvas, 0, 0, out.width, out.height);

      const link = document.createElement("a");
      const label =
        projectName ||
        (initialParcelles.length === 1
          ? `parcelle-${initialParcelles[0].section}-${initialParcelles[0].numero}`
          : `parcelles-${initialParcelles.length}`);
      link.download = label + ".png";
      link.href = out.toDataURL("image/png");
      link.click();
      showToast("Image exportée.");
    } catch {
      showToast("Échec de l'export. Réessayez.");
    }
  }

  if (initialParcelles.length === 0) {
    return <Navigate to="/" replace />;
  }

  const panMode = tool === "pan";
  const selectedShape = shapes.find((s) => s.id === selectedId);
  const canEditText = tool === "select" && selectedShape?.type === "text";

  return (
    <div className="editor">
      <Toolbar
        baseLayer={baseLayer}
        setBaseLayer={setBaseLayer}
        showCadastre={showCadastre}
        setShowCadastre={setShowCadastre}
        onBack={() => navigate("/")}
      />

      <div className="editor__stage" ref={wrapperRef}>
        <div className="editor__bg">
          <MapLibreEditorMap
            parcelles={initialParcelles}
            baseLayer={baseLayer}
            showCadastre={showCadastre}
            initialView={initialProject?.view}
            onMap={handleMap}
          />
        </div>
        <div className={"editor__draw" + (panMode ? " editor__draw--pan" : "")}>
          {mapReady && size.width > 0 && (
            <AnnotationCanvas
              width={size.width}
              height={size.height}
              shapes={shapes}
              tool={tool}
              color={color}
              strokeWidth={strokeWidth}
              currentSymbol={currentSymbol}
              selectedId={selectedId}
              stageRef={stageRef}
              project={project}
              unproject={unproject}
              zoom={mapRef.current?.getZoom() ?? 0}
              bearing={mapRef.current?.getBearing() ?? 0}
              onSelect={setSelectedId}
              onAddShape={addShape}
              onUpdateShape={updateShape}
              onRequestSelectTool={() => setTool("select")}
              editRequestId={editTextRequestId}
              onEditRequestHandled={handleEditRequestHandled}
            />
          )}
        </div>

        <EditorControls
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          currentSymbol={currentSymbol}
          setCurrentSymbol={setCurrentSymbol}
          canUndo={past.length > 0}
          onUndo={undo}
          hasSelection={selectedId !== null}
          canEditText={canEditText}
          onEditSelectedText={handleEditSelectedText}
          onDeleteSelected={deleteSelected}
          onClear={clearAll}
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onRotateLeft={() =>
            mapRef.current?.easeTo({
              bearing: (mapRef.current?.getBearing() ?? 0) - 15,
            })
          }
          onRotateRight={() =>
            mapRef.current?.easeTo({
              bearing: (mapRef.current?.getBearing() ?? 0) + 15,
            })
          }
          onResetNorth={() => mapRef.current?.easeTo({ bearing: 0 })}
          onSave={save}
          onExport={exportPng}
        />
      </div>

      {toast && <div className="editor__toast">{toast}</div>}
    </div>
  );
}
