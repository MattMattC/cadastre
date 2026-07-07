import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  Stage,
  Layer,
  Group,
  Line,
  Arrow,
  Rect,
  Ellipse,
  Text,
  Image as KonvaImage,
  Transformer,
} from "react-konva";
import Konva from "konva";
import type { LatLng, Shape, ShapeType, ToolKind } from "../../types";
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
  const size = (shape.size ?? 32) * scale;
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
          size: Math.max(10 / scale, (shape.size ?? 32) * sx),
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
  onRequestSelectTool: () => void;
  // Déclenche l'édition d'un texte depuis l'UI (bouton Éditer).
  editRequestId?: string | null;
  onEditRequestHandled?: () => void;
}

const TRANSFORMABLE: ShapeType[] = [
  "line",
  "arrow",
  "rect",
  "ellipse",
  "text",
  "symbol",
];
const ROTATABLE: ShapeType[] = ["line", "arrow", "text", "symbol"];

interface SegmentProps {
  shape: Shape;
  variant: "line" | "arrow";
  project: (ll: LatLng) => Pt;
  unproject: (p: Pt) => LatLng;
  // Facteur d'échelle lié au zoom (2^(zoom - baseZoom)).
  scale: number;
  draggable: boolean;
  refCb: (node: Konva.Node | null) => void;
  onSelect: (e?: Konva.KonvaEventObject<Event>) => void;
  onUpdateShape: (id: string, patch: Partial<Shape>) => void;
}

// Trait ou flèche à 2 points, redimensionnable et pivotable via un Group.
function SegmentShape({
  shape,
  variant,
  project,
  unproject,
  scale,
  draggable,
  refCb,
  onSelect,
  onUpdateShape,
}: SegmentProps) {
  const ll0 = shape.latlngs![0];
  const ll1 = shape.latlngs![1];
  const p1 = project(ll0);
  const p2 = project(ll1);
  const cx = (p1.x + p2.x) / 2;
  const cy = (p1.y + p2.y) / 2;
  const halfLen = Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2;
  const angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  const sw = shape.strokeWidth * scale;
  const hitH = Math.max(14, sw) * 2;

  return (
    <Group
      id={shape.id}
      ref={refCb}
      x={cx}
      y={cy}
      rotation={angle}
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
      onTransformEnd={(e) => {
        const node = e.target as Konva.Group;
        const sx = node.scaleX();
        const sy = node.scaleY();
        const rot = (node.rotation() * Math.PI) / 180;
        node.scaleX(1);
        node.scaleY(1);
        const newHalf = halfLen * sx;
        const ncx = node.x();
        const ncy = node.y();
        onUpdateShape(shape.id, {
          latlngs: [
            unproject({
              x: ncx - newHalf * Math.cos(rot),
              y: ncy - newHalf * Math.sin(rot),
            }),
            unproject({
              x: ncx + newHalf * Math.cos(rot),
              y: ncy + newHalf * Math.sin(rot),
            }),
          ],
          strokeWidth: Math.max(1, shape.strokeWidth * sy),
        });
      }}
    >
      {variant === "arrow" ? (
        <Arrow
          points={[-halfLen, 0, halfLen, 0]}
          stroke={shape.color}
          fill={shape.color}
          strokeWidth={sw}
          pointerLength={(10 + shape.strokeWidth) * scale}
          pointerWidth={(10 + shape.strokeWidth) * scale}
          listening={false}
        />
      ) : (
        <Line
          points={[-halfLen, 0, halfLen, 0]}
          stroke={shape.color}
          strokeWidth={sw}
          lineCap="round"
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
  );
}

export default function AnnotationCanvas({
  width,
  height,
  shapes,
  tool,
  color,
  strokeWidth,
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
  onRequestSelectTool,
  editRequestId,
  onEditRequestHandled,
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

  function editText(shape: Shape) {
    if (shape.type !== "text") return;
    onSelect(shape.id);
    setTextPrompt({
      mode: "edit",
      shapeId: shape.id,
      initial: shape.text ?? "",
    });
  }

  // Édition demandée par le bouton « Éditer ».
  useEffect(() => {
    if (!editRequestId) return;
    const shape = shapes.find((s) => s.id === editRequestId && s.type === "text");
    if (shape) editText(shape);
    onEditRequestHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequestId]);

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
      setTextPrompt({ mode: "create", latlng: ll });
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
          size: 30 + strokeWidth * 4,
          color: def.color ?? color,
          strokeWidth,
          baseZoom: zoom,
          baseBearing: bearing,
        });
      } else {
        onAddShape({
          id: newId(),
          type: "symbol",
          latlng: ll,
          symbolId: def?.id,
          text: def?.text ?? currentSymbol,
          fontSize: 22 + strokeWidth * 4,
          color: def?.color ?? color,
          strokeWidth,
          baseZoom: zoom,
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
      strokeWidth,
      baseZoom: zoom,
      baseBearing: bearing,
    };
    if (tool === "pen") {
      setDraft({ ...base, type: "pen", latlngs: [ll] });
    } else if (tool === "line" || tool === "arrow") {
      setDraft({ ...base, type: tool, latlngs: [ll, ll] });
    } else if (tool === "rect" || tool === "ellipse") {
      setDraft({ ...base, type: tool, latlngs: [ll, ll] });
    }
  }

  function handleMove() {
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
            variant={shape.type}
            project={project}
            unproject={unproject}
            scale={scale}
            draggable={draggable}
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
    // Édition via le bouton « ✎ Éditer » quand le texte est sélectionné.
    return (
      <Text
        key={shape.id}
        id={shape.id}
        ref={isDraft ? undefined : registerRef(shape.id)}
        draggable={draggable}
        onClick={selectShape}
        onTap={selectShape}
        {...blockStage}
        x={p.x}
        y={p.y}
        text={shape.text}
        fontSize={(shape.fontSize ?? 16) * scale}
        fill={shape.color}
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
            fontSize: Math.max(8, (shape.fontSize ?? 16) * sx),
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
          fontSize: Math.max(16, strokeWidth * 5),
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
        // Taille affichée à l'échelle de la vue courante.
        fontSize: (shape.fontSize ?? 16) * scaleFor(shape),
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
          initialValue={inlineText.initial}
          onConfirm={(value) => {
            if (textPrompt!.mode === "create") {
              const id = newId();
              onAddShape({
                id,
                type: "text",
                latlng: textPrompt!.latlng,
                text: value,
                fontSize: Math.max(16, strokeWidth * 5),
                color,
                strokeWidth,
                baseZoom: zoom,
                baseBearing: bearing,
              });
              // Bascule en sélection et cible le nouveau texte : il est
              // immédiatement déplaçable / redimensionnable / pivotable.
              onRequestSelectTool();
              onSelect(id);
            } else {
              onUpdateShape(textPrompt!.shapeId, { text: value });
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
