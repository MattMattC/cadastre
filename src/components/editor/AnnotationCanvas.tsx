import { Fragment, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { RefObject } from "react";
import {
  Stage,
  Layer,
  Group,
  Line,
  Rect,
  Circle,
  Ellipse,
  Text,
  Image as KonvaImage,
  Transformer,
} from "react-konva";
import Konva from "konva";
import type { LatLng, LineArrows, Shape, ShapeType, ToolKind } from "../../types";
import { newId } from "../../store/projects";
import { getSymbol, svgToDataUrl } from "./symbols";
import InlineTextEditor from "./InlineTextEditor";

interface Pt {
  x: number;
  y: number;
}

// Charge un SVG (data URL) dans un élément Image pour Konva.
function useSvgImage(svg: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const image = new window.Image();
    image.onload = () => setImg(image);
    image.src = svgToDataUrl(svg);
    return () => {
      image.onload = null;
    };
  }, [svg]);
  return img;
}

interface SymbolImageProps {
  shape: Shape;
  svg: string;
  x: number;
  y: number;
  // Facteur d'échelle lié au zoom (2^(zoom - baseZoom)).
  scale: number;
  // Rotation écran ajoutée par la rotation de la carte (baseBearing - bearing).
  rotDelta: number;
  draggable: boolean;
  refCb: (node: Konva.Node | null) => void;
  onSelect: (e?: Konva.KonvaEventObject<Event>) => void;
  unproject: (p: Pt) => LatLng;
  onUpdateShape: (id: string, patch: Partial<Shape>) => void;
}

// Pictogramme SVG rendu comme image, ancré (et centré) sur sa position géo.
function SymbolImage({
  shape,
  svg,
  x,
  y,
  scale,
  rotDelta,
  draggable,
  refCb,
  onSelect,
  unproject,
  onUpdateShape,
}: SymbolImageProps) {
  const img = useSvgImage(svg);
  if (!img) return null;
  const size = (shape.size ?? 3) * scale;
  return (
    <KonvaImage
      id={shape.id}
      ref={refCb}
      image={img}
      x={x}
      y={y}
      width={size}
      height={size}
      offsetX={size / 2}
      offsetY={size / 2}
      rotation={(shape.rotation ?? 0) + rotDelta}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) => {
        const node = e.target;
        onUpdateShape(shape.id, {
          latlng: unproject({ x: node.x(), y: node.y() }),
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const sx = node.scaleX();
        node.scaleX(1);
        node.scaleY(1);
        onUpdateShape(shape.id, {
          latlng: unproject({ x: node.x(), y: node.y() }),
          size: Math.max(1.5 / scale, (shape.size ?? 3) * sx),
          rotation: node.rotation() - rotDelta,
        });
      }}
    />
  );
}

interface Props {
  width: number;
  height: number;
  shapes: Shape[];
  tool: ToolKind;
  color: string;
  strokeWidth: number;
  // Options de l'outil trait.
  lineDashed: boolean;
  lineArrows: LineArrows;
  currentSymbol: string;
  selectedId: string | null;
  stageRef: RefObject<Konva.Stage>;
  project: (ll: LatLng) => Pt;
  unproject: (p: Pt) => LatLng;
  // Vue carte courante : sert à mettre les tailles à l'échelle du terrain.
  zoom: number;
  bearing: number;
  onSelect: (id: string | null) => void;
  onAddShape: (shape: Shape) => void;
  onUpdateShape: (id: string, patch: Partial<Shape>) => void;
  // Gomme : suppression immédiate d'une forme.
  onDeleteShape: (id: string) => void;
  onRequestSelectTool: () => void;
}

const TRANSFORMABLE: ShapeType[] = [
  "rect",
  "ellipse",
  "text",
  "symbol",
];
const ROTATABLE: ShapeType[] = ["text", "symbol"];

interface SegmentProps {
  shape: Shape;
  project: (ll: LatLng) => Pt;
  unproject: (p: Pt) => LatLng;
  // Facteur d'échelle lié au zoom (2^(zoom - baseZoom)).
  scale: number;
  draggable: boolean;
  // Sélectionné : halo + poignée à chaque extrémité.
  selected: boolean;
  refCb: (node: Konva.Node | null) => void;
  onSelect: (e?: Konva.KonvaEventObject<Event>) => void;
  onUpdateShape: (id: string, patch: Partial<Shape>) => void;
}

const HANDLE_RADIUS = 8;

// Zoom de référence des symboles et des formes dessinées (trait, crayon,
// rectangle, ellipse) : taille et épaisseur sont exprimées à ce zoom, pas au
// zoom courant, pour que deux formes créées à des zooms différents aient la
// même taille terrain. Le texte, lui, garde le zoom de création.
const REF_ZOOM = 18;

// Épaisseur réelle des formes dessinées = curseur d'épaisseur / ce diviseur.
const STROKE_DIVISOR = 4;

// Police des textes : la même sur le canvas et dans l'éditeur inline.
const TEXT_FONT = "Arial, Helvetica, sans-serif";

// Taille de police d'un nouveau texte, exprimée au zoom de référence.
function textFontSize(strokeWidth: number): number {
  return (12 + strokeWidth * 4) / 4;
}

// Trait à 2 points (plein ou tirets, avec 0, 1 ou 2 têtes de flèche).
// Déplaçable en bloc ; longueur et orientation se règlent en tirant les
// poignées d'extrémité (pas de Transformer).
function SegmentShape({
  shape,
  project,
  unproject,
  scale,
  draggable,
  selected,
  refCb,
  onSelect,
  onUpdateShape,
}: SegmentProps) {
  // Extrémité en cours de déplacement : aperçu local, un seul commit au relâché.
  const [dragEnd, setDragEnd] = useState<{ idx: 0 | 1; pt: Pt } | null>(null);
  const ll0 = shape.latlngs![0];
  const ll1 = shape.latlngs![1];
  const p1 = dragEnd?.idx === 0 ? dragEnd.pt : project(ll0);
  const p2 = dragEnd?.idx === 1 ? dragEnd.pt : project(ll1);
  const cx = (p1.x + p2.x) / 2;
  const cy = (p1.y + p2.y) / 2;
  const halfLen = Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2;
  const angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  const sw = shape.strokeWidth * scale;
  const hitH = Math.max(14, sw) * 2;
  // Les anciennes formes "arrow" n'ont pas de champ `arrows`.
  const arrows: LineArrows =
    shape.arrows ?? (shape.type === "arrow" ? "end" : "none");
  // Tête de flèche proportionnée au trait (épaisseur déjà divisée).
  const headLen =
    arrows === "none"
      ? 0
      : ((10 + shape.strokeWidth * STROKE_DIVISOR) / STROKE_DIVISOR) * scale;
  // Le fût s'arrête un peu avant la pointe pour ne pas dépasser sous la tête.
  const x0 = arrows === "both" ? -halfLen + headLen * 0.7 : -halfLen;
  const x1 = Math.max(x0, arrows === "none" ? halfLen : halfLen - headLen * 0.7);
  const dash = shape.dashed ? [sw * 3, sw * 2] : undefined;

  const stop = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
  };

  function handleAt(idx: 0 | 1, pt: Pt) {
    return (
      <Circle
        key={idx}
        x={pt.x}
        y={pt.y}
        radius={HANDLE_RADIUS}
        fill="#ffffff"
        stroke={shape.color}
        strokeWidth={2}
        shadowColor="rgba(0,0,0,0.35)"
        shadowBlur={3}
        draggable
        onMouseDown={stop}
        onTouchStart={stop}
        onDragMove={(e) => {
          const node = e.target;
          setDragEnd({ idx, pt: { x: node.x(), y: node.y() } });
        }}
        onDragEnd={(e) => {
          const node = e.target;
          const next = [...shape.latlngs!] as LatLng[];
          next[idx] = unproject({ x: node.x(), y: node.y() });
          setDragEnd(null);
          onUpdateShape(shape.id, { latlngs: next });
        }}
      />
    );
  }

  return (
    <Fragment>
    <Group
      id={shape.id}
      ref={refCb}
      x={cx}
      y={cy}
      rotation={angle}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onMouseDown={stop}
      onTouchStart={stop}
      onDragEnd={(e) => {
        const node = e.target;
        const dx = node.x() - cx;
        const dy = node.y() - cy;
        node.position({ x: cx, y: cy });
        onUpdateShape(shape.id, {
          latlngs: shape.latlngs!.map((ll) => {
            const p = project(ll);
            return unproject({ x: p.x + dx, y: p.y + dy });
          }),
        });
      }}
    >
      {selected && (
        <Line
          points={[-halfLen, 0, halfLen, 0]}
          stroke="#ffffff"
          strokeWidth={sw + 8}
          lineCap="round"
          opacity={0.85}
          listening={false}
        />
      )}
      <Line
        points={[x0, 0, x1, 0]}
        stroke={shape.color}
        strokeWidth={sw}
        lineCap={shape.dashed ? "butt" : "round"}
        dash={dash}
        listening={false}
      />
      {arrows !== "none" && (
        <Line
          points={[
            halfLen, 0,
            halfLen - headLen, -headLen / 2,
            halfLen - headLen, headLen / 2,
          ]}
          closed
          fill={shape.color}
          listening={false}
        />
      )}
      {arrows === "both" && (
        <Line
          points={[
            -halfLen, 0,
            -halfLen + headLen, -headLen / 2,
            -halfLen + headLen, headLen / 2,
          ]}
          closed
          fill={shape.color}
          listening={false}
        />
      )}
      <Rect
        x={-halfLen}
        y={-hitH / 2}
        width={halfLen * 2}
        height={hitH}
        opacity={0}
      />
    </Group>
    {selected && draggable && handleAt(0, p1)}
    {selected && draggable && handleAt(1, p2)}
    </Fragment>
  );
}

export default function AnnotationCanvas({
  width,
  height,
  shapes,
  tool,
  color,
  strokeWidth,
  lineDashed,
  lineArrows,
  currentSymbol,
  selectedId,
  stageRef,
  project,
  unproject,
  zoom,
  bearing,
  onSelect,
  onAddShape,
  onUpdateShape,
  onDeleteShape,
  onRequestSelectTool,
}: Props) {
  const [draft, setDraft] = useState<Shape | null>(null);
  const [textPrompt, setTextPrompt] = useState<
    | { mode: "create"; latlng: LatLng }
    | { mode: "edit"; shapeId: string; initial: string }
    | null
  >(null);
  const drawing = useRef(false);
  // Horodatage du dernier touchstart, pour filtrer le mousedown fantôme.
  const lastTouch = useRef(0);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());

  // Ouvre l'éditeur inline de façon synchrone, pendant le geste utilisateur :
  // indispensable pour que le focus (et le clavier mobile) soit accepté.
  function openTextPrompt(prompt: NonNullable<typeof textPrompt>) {
    flushSync(() => setTextPrompt(prompt));
  }

  function editText(shape: Shape) {
    if (shape.type !== "text") return;
    onSelect(shape.id);
    openTextPrompt({
      mode: "edit",
      shapeId: shape.id,
      initial: shape.text ?? "",
    });
  }

  // Si le texte en cours d'édition disparaît (suppression, annulation),
  // on referme l'éditeur au lieu de garder une édition fantôme.
  useEffect(() => {
    if (textPrompt?.mode !== "edit") return;
    if (!shapes.some((s) => s.id === textPrompt.shapeId)) setTextPrompt(null);
  }, [shapes, textPrompt]);

  // Attache le Transformer à la forme sélectionnée.
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const shape = shapes.find((s) => s.id === selectedId);
    if (tool !== "select" || !shape || !TRANSFORMABLE.includes(shape.type)) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    tr.rotateEnabled(ROTATABLE.includes(shape.type));
    // Textes et symboles : poignées aux coins seulement, sinon elles
    // recouvrent la forme (souvent petite) et empêchent de la toucher.
    tr.enabledAnchors(
      shape.type === "text" || shape.type === "symbol"
        ? ["top-left", "top-right", "bottom-left", "bottom-right"]
        : [
            "top-left", "top-center", "top-right",
            "middle-left", "middle-right",
            "bottom-left", "bottom-center", "bottom-right",
          ],
    );
    const node = nodeRefs.current.get(selectedId!);
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  });

  function pointer(): Pt | null {
    const stage = stageRef.current;
    return stage ? stage.getPointerPosition() : null;
  }

  // Retrouve l'id de forme depuis le nœud Konva cliqué (lui ou un parent).
  function shapeIdAt(target: Konva.Node): string | null {
    let node: Konva.Node | null = target;
    while (node && node.getType() !== "Stage") {
      const id = node.id();
      if (id) return id;
      node = node.getParent();
    }
    return null;
  }

  // Empêche le Stage de traiter un clic déjà pris par une annotation.
  function stopToStage(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    e.cancelBubble = true;
  }

  // Facteur d'échelle d'une forme : 1 au zoom de création, ×2 par niveau.
  function scaleFor(shape: Shape): number {
    return Math.pow(2, zoom - (shape.baseZoom ?? zoom));
  }

  // Rotation écran induite par la rotation de la carte depuis la création.
  function rotFor(shape: Shape): number {
    return (shape.baseBearing ?? bearing) - bearing;
  }

  function handleDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    // Sur tactile, un tap émet touchstart PUIS un mousedown « fantôme ».
    if (e.evt.type === "touchstart") {
      lastTouch.current = Date.now();
    } else if (Date.now() - lastTouch.current < 700) {
      return;
    }

    const pos = pointer();
    if (!pos) return;

    const stage = e.target.getStage();
    const onEmpty = e.target === stage;
    const hitId = shapeIdAt(e.target);
    const ll = unproject(pos);

    if (tool === "pan") return;

    if (tool === "eraser") {
      if (hitId) onDeleteShape(hitId);
      return;
    }

    // Clic/tap sur une annotation existante → sélection (jamais création/édition).
    if (!onEmpty && hitId) {
      if (tool !== "select") onRequestSelectTool();
      onSelect(hitId);
      return;
    }

    if (tool === "select") {
      if (onEmpty) onSelect(null);
      return;
    }

    if (tool === "text") {
      // Konva ne bloque pas le mousedown souris : sans ça, l'action par
      // défaut du navigateur reprendrait le focus juste après l'avoir donné.
      if (e.evt.cancelable) e.evt.preventDefault();
      openTextPrompt({ mode: "create", latlng: ll });
      return;
    }

    if (tool === "symbol") {
      const def = getSymbol(currentSymbol);
      if (def?.kind === "svg" && def.svg) {
        onAddShape({
          id: newId(),
          type: "symbol",
          latlng: ll,
          symbolId: def.id,
          size: (30 + strokeWidth * 4) / 12,
          color: def.color ?? color,
          strokeWidth,
          baseZoom: REF_ZOOM,
          baseBearing: bearing,
        });
      } else {
        onAddShape({
          id: newId(),
          type: "symbol",
          latlng: ll,
          symbolId: def?.id,
          text: def?.text ?? currentSymbol,
          fontSize: (22 + strokeWidth * 4) / 12,
          color: def?.color ?? color,
          strokeWidth,
          baseZoom: REF_ZOOM,
          baseBearing: bearing,
        });
      }
      onRequestSelectTool();
      return;
    }

    drawing.current = true;
    const base = {
      id: newId(),
      color,
      strokeWidth: strokeWidth / STROKE_DIVISOR,
      baseZoom: REF_ZOOM,
      baseBearing: bearing,
    };
    if (tool === "pen") {
      setDraft({ ...base, type: "pen", latlngs: [ll] });
    } else if (tool === "line") {
      setDraft({
        ...base,
        type: "line",
        latlngs: [ll, ll],
        dashed: lineDashed,
        arrows: lineArrows,
      });
    } else if (tool === "rect" || tool === "ellipse") {
      setDraft({ ...base, type: tool, latlngs: [ll, ll] });
    }
  }

  function handleMove(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (tool === "eraser") {
      const pressed =
        e.evt.type === "touchmove" || ((e.evt as MouseEvent).buttons & 1) === 1;
      const stage = stageRef.current;
      const pos = pointer();
      if (!pressed || !stage || !pos) return;
      const hit = stage.getIntersection(pos);
      const id = hit ? shapeIdAt(hit) : null;
      if (id) onDeleteShape(id);
      return;
    }
    if (!drawing.current || !draft) return;
    const pos = pointer();
    if (!pos) return;
    const ll = unproject(pos);

    if (draft.type === "pen") {
      setDraft({ ...draft, latlngs: [...(draft.latlngs ?? []), ll] });
    } else {
      const first = draft.latlngs?.[0] ?? ll;
      setDraft({ ...draft, latlngs: [first, ll] });
    }
  }

  function handleUp() {
    drawing.current = false;
    if (!draft) return;
    const pts = draft.latlngs ?? [];
    // Ignore les tracés trop courts (clic sans glissement).
    const tooSmall =
      (draft.type === "pen" && pts.length < 2) ||
      (draft.type !== "pen" &&
        pts.length === 2 &&
        samePoint(project(pts[0]), project(pts[1])));
    if (!tooSmall) onAddShape(draft);
    setDraft(null);
  }

  function samePoint(a: Pt, b: Pt) {
    return Math.abs(a.x - b.x) < 4 && Math.abs(a.y - b.y) < 4;
  }

  function registerRef(id: string) {
    return (node: Konva.Node | null) => {
      if (node) nodeRefs.current.set(id, node);
      else nodeRefs.current.delete(id);
    };
  }

  // Décale tous les ancrages géo d'une forme d'un delta pixel.
  function shiftAnchors(shape: Shape, dx: number, dy: number): Partial<Shape> {
    if (shape.latlngs) {
      return {
        latlngs: shape.latlngs.map((ll) => {
          const p = project(ll);
          return unproject({ x: p.x + dx, y: p.y + dy });
        }),
      };
    }
    if (shape.latlng) {
      const p = project(shape.latlng);
      return { latlng: unproject({ x: p.x + dx, y: p.y + dy }) };
    }
    return {};
  }

  function renderShape(shape: Shape, isDraft = false) {
    if (
      textPrompt?.mode === "edit" &&
      textPrompt.shapeId === shape.id &&
      shape.type === "text"
    ) {
      return null;
    }

    const draggable = tool === "select" && !isDraft;
    const isSelected = selectedId === shape.id && !isDraft;
    const selectShape = (e?: Konva.KonvaEventObject<Event>) => {
      if (e) e.cancelBubble = true;
      if (tool === "eraser") {
        onDeleteShape(shape.id);
        return;
      }
      if (shape.type === "text") {
        // Outil Texte sur un texte existant, ou tap sur un texte déjà
        // sélectionné : on passe directement en édition.
        if (tool === "text" || (tool === "select" && selectedId === shape.id)) {
          editText(shape);
          return;
        }
      }
      if (tool !== "select") onRequestSelectTool();
      onSelect(shape.id);
    };
    const blockStage = {
      onMouseDown: stopToStage,
      onTouchStart: stopToStage,
    };
    // Échelle et rotation « terrain » de la forme pour la vue courante.
    const scale = scaleFor(shape);
    const rotDelta = rotFor(shape);

    // Conversion des ancrages géo → pixels pour l'affichage courant.
    if (shape.type === "pen" || shape.type === "line" || shape.type === "arrow") {
      if (shape.type === "line" || shape.type === "arrow") {
        return (
          <SegmentShape
            key={shape.id}
            shape={shape}
            project={project}
            unproject={unproject}
            scale={scale}
            draggable={draggable}
            selected={isSelected}
            refCb={isDraft ? () => {} : registerRef(shape.id)}
            onSelect={selectShape}
            onUpdateShape={onUpdateShape}
          />
        );
      }
      const flat = (shape.latlngs ?? []).flatMap((ll) => {
        const p = project(ll);
        return [p.x, p.y];
      });
      const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
        const node = e.target;
        const patch = shiftAnchors(shape, node.x(), node.y());
        node.position({ x: 0, y: 0 });
        onUpdateShape(shape.id, patch);
      };
      return (
        <Group
          key={shape.id}
          id={shape.id}
          ref={isDraft ? undefined : registerRef(shape.id)}
          draggable={draggable}
          onClick={selectShape}
          onTap={selectShape}
          {...blockStage}
          onDragEnd={onDragEnd}
        >
          {isSelected && (
            <Line
              points={flat}
              stroke="#ffffff"
              strokeWidth={shape.strokeWidth * scale + 8}
              lineCap="round"
              lineJoin="round"
              tension={0.3}
              opacity={0.85}
              listening={false}
            />
          )}
          <Line
            points={flat}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth * scale}
            lineCap="round"
            lineJoin="round"
            tension={0.3}
            listening={false}
          />
          <Line
            points={flat}
            stroke="rgba(0, 0, 0, 0.01)"
            strokeWidth={Math.max(28, shape.strokeWidth * scale + 18)}
            lineCap="round"
            lineJoin="round"
            tension={0.3}
          />
        </Group>
      );
    }

    if (shape.type === "rect" || shape.type === "ellipse") {
      const a = project(shape.latlngs![0]);
      const b = project(shape.latlngs![1]);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      // La forme garde son orientation terrain : la diagonale projetée est
      // exprimée dans le repère local (tourné de rotDelta) pour retrouver
      // largeur/hauteur, puis le Group est pivoté d'autant à l'écran.
      const rad = (rotDelta * Math.PI) / 180;
      const dxDiag = b.x - a.x;
      const dyDiag = b.y - a.y;
      const w = Math.abs(dxDiag * Math.cos(rad) + dyDiag * Math.sin(rad));
      const h = Math.abs(-dxDiag * Math.sin(rad) + dyDiag * Math.cos(rad));

      // Coins opposés (repère local → écran → géo) pour un centre/taille donnés.
      const cornersToLatLngs = (ncx: number, ncy: number, nw: number, nh: number) => {
        const toWorld = (p: Pt): Pt => ({
          x: ncx + p.x * Math.cos(rad) - p.y * Math.sin(rad),
          y: ncy + p.x * Math.sin(rad) + p.y * Math.cos(rad),
        });
        return [
          unproject(toWorld({ x: -nw / 2, y: -nh / 2 })),
          unproject(toWorld({ x: nw / 2, y: nh / 2 })),
        ];
      };

      const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
        const node = e.target;
        const dx = node.x() - cx;
        const dy = node.y() - cy;
        node.position({ x: cx, y: cy });
        onUpdateShape(shape.id, shiftAnchors(shape, dx, dy));
      };

      const onTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
        const node = e.target as Konva.Group;
        const sx = node.scaleX();
        const sy = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onUpdateShape(shape.id, {
          latlngs: cornersToLatLngs(node.x(), node.y(), w * sx, h * sy),
        });
      };

      return (
        <Group
          key={shape.id}
          id={shape.id}
          ref={isDraft ? undefined : registerRef(shape.id)}
          x={cx}
          y={cy}
          rotation={rotDelta}
          draggable={draggable}
          onClick={selectShape}
          onTap={selectShape}
          {...blockStage}
          onDragEnd={onDragEnd}
          onTransformEnd={onTransformEnd}
        >
          {shape.type === "rect" ? (
            <Rect
              x={-w / 2}
              y={-h / 2}
              width={w}
              height={h}
              stroke={shape.color}
              strokeWidth={shape.strokeWidth * scale}
            />
          ) : (
            <Ellipse
              x={0}
              y={0}
              radiusX={w / 2}
              radiusY={h / 2}
              stroke={shape.color}
              strokeWidth={shape.strokeWidth * scale}
            />
          )}
        </Group>
      );
    }

    // text / symbol
    const p = project(shape.latlng!);
    const def = shape.symbolId ? getSymbol(shape.symbolId) : undefined;
    if (shape.type === "symbol" && def?.kind === "svg" && def.svg) {
      return (
        <SymbolImage
          key={shape.id}
          shape={shape}
          svg={def.svg}
          x={p.x}
          y={p.y}
          scale={scale}
          rotDelta={rotDelta}
          draggable={draggable}
          refCb={isDraft ? () => {} : registerRef(shape.id)}
          onSelect={selectShape}
          unproject={unproject}
          onUpdateShape={onUpdateShape}
        />
      );
    }
    // Texte : déplaçable / redimensionnable / pivotable comme un symbole.
    // Édition : double-clic / double-tap, tap sur un texte déjà sélectionné,
    // ou tap avec l'outil Texte.
    const fs = (shape.fontSize ?? 16) * scale;
    return (
      <Text
        key={shape.id}
        id={shape.id}
        ref={isDraft ? undefined : registerRef(shape.id)}
        draggable={draggable}
        onClick={selectShape}
        onTap={selectShape}
        onDblClick={() => editText(shape)}
        onDblTap={() => editText(shape)}
        {...blockStage}
        x={p.x}
        y={p.y}
        text={shape.text}
        fontSize={fs}
        fontFamily={TEXT_FONT}
        fontStyle="bold"
        fill={shape.color}
        // Halo blanc pour rester lisible sur la photo aérienne.
        stroke="#ffffff"
        strokeWidth={Math.max(1, fs * 0.14)}
        fillAfterStrokeEnabled
        lineJoin="round"
        rotation={(shape.rotation ?? 0) + rotDelta}
        onDragEnd={(e) => {
          const node = e.target;
          onUpdateShape(shape.id, {
            latlng: unproject({ x: node.x(), y: node.y() }),
          });
        }}
        onTransformEnd={(e) => {
          const node = e.target as Konva.Text;
          const sx = node.scaleX();
          node.scaleX(1);
          node.scaleY(1);
          onUpdateShape(shape.id, {
            latlng: unproject({ x: node.x(), y: node.y() }),
            fontSize: Math.max(1, (shape.fontSize ?? 16) * sx),
            rotation: node.rotation() - rotDelta,
          });
        }}
      />
    );
  }

  const inlineText =
    textPrompt &&
    (() => {
      if (textPrompt.mode === "create") {
        const p = project(textPrompt.latlng);
        return {
          x: p.x,
          y: p.y,
          color,
          // Taille affichée au zoom courant (la taille est stockée à REF_ZOOM).
          fontSize: textFontSize(strokeWidth) * Math.pow(2, zoom - REF_ZOOM),
          rotation: 0,
          initial: "",
        };
      }
      const shape = shapes.find((s) => s.id === textPrompt.shapeId);
      if (!shape?.latlng) return null;
      const p = project(shape.latlng);
      return {
        x: p.x,
        y: p.y,
        color: shape.color,
        // Taille et rotation affichées à l'échelle de la vue courante.
        fontSize: (shape.fontSize ?? 16) * scaleFor(shape),
        rotation: (shape.rotation ?? 0) + rotFor(shape),
        initial: textPrompt.initial,
      };
    })();

  return (
    <div className="annotation-canvas" style={{ width, height }}>
      {inlineText && (
        <InlineTextEditor
          x={inlineText.x}
          y={inlineText.y}
          color={inlineText.color}
          fontSize={inlineText.fontSize}
          rotation={inlineText.rotation}
          initialValue={inlineText.initial}
          onConfirm={(value) => {
            if (textPrompt!.mode === "create") {
              if (value) {
                const id = newId();
                onAddShape({
                  id,
                  type: "text",
                  latlng: textPrompt!.latlng,
                  text: value,
                  fontSize: textFontSize(strokeWidth),
                  color,
                  strokeWidth,
                  baseZoom: REF_ZOOM,
                  baseBearing: bearing,
                });
                // Bascule en sélection et cible le nouveau texte : il est
                // immédiatement déplaçable / redimensionnable / pivotable.
                onRequestSelectTool();
                onSelect(id);
              }
            } else if (value) {
              onUpdateShape(textPrompt!.shapeId, { text: value });
            } else {
              // Texte vidé à l'édition : on supprime la forme.
              onDeleteShape(textPrompt!.shapeId);
            }
            setTextPrompt(null);
          }}
          onCancel={() => setTextPrompt(null)}
        />
      )}
      <Stage
      ref={stageRef}
      width={width}
      height={height}
      onMouseDown={handleDown}
      onTouchStart={handleDown}
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onMouseUp={handleUp}
      onTouchEnd={handleUp}
      style={{ cursor: tool === "select" || tool === "pan" ? "default" : "crosshair" }}
    >
      <Layer>
        {shapes.map((s) => renderShape(s))}
        {draft && renderShape(draft, true)}
        <Transformer
          ref={trRef}
          ignoreStroke
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 6 || newBox.height < 6 ? oldBox : newBox
          }
        />
      </Layer>
    </Stage>
    </div>
  );
}
