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
  size: number;
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
  size,
  draggable,
  refCb,
  onSelect,
  unproject,
  onUpdateShape,
}: SymbolImageProps) {
  const img = useSvgImage(svg);
  if (!img) return null;
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
      rotation={shape.rotation}
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
          size: Math.max(10, size * sx),
          rotation: node.rotation(),
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
  const hitH = Math.max(14, shape.strokeWidth) * 2;

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
          strokeWidth={shape.strokeWidth}
          pointerLength={10 + shape.strokeWidth}
          pointerWidth={10 + shape.strokeWidth}
          listening={false}
        />
      ) : (
        <Line
          points={[-halfLen, 0, halfLen, 0]}
          stroke={shape.color}
          strokeWidth={shape.strokeWidth}
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
        });
      }
      onRequestSelectTool();
      return;
    }

    drawing.current = true;
    const base = { id: newId(), color, strokeWidth };
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
              strokeWidth={shape.strokeWidth + 8}
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
            strokeWidth={shape.strokeWidth}
            lineCap="round"
            lineJoin="round"
            tension={0.3}
            listening={false}
          />
          <Line
            points={flat}
            stroke="rgba(0, 0, 0, 0.01)"
            strokeWidth={Math.max(28, shape.strokeWidth + 18)}
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
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x);
      const h = Math.abs(b.y - a.y);

      const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
        const node = e.target;
        const dx = node.x() - (shape.type === "rect" ? x : x + w / 2);
        const dy = node.y() - (shape.type === "rect" ? y : y + h / 2);
        const patch = shiftAnchors(shape, dx, dy);
        onUpdateShape(shape.id, patch);
      };

      if (shape.type === "rect") {
        return (
          <Rect
            key={shape.id}
            id={shape.id}
            ref={isDraft ? undefined : registerRef(shape.id)}
            draggable={draggable}
            onClick={selectShape}
            onTap={selectShape}
            {...blockStage}
            x={x}
            y={y}
            width={w}
            height={h}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            onDragEnd={onDragEnd}
            onTransformEnd={(e) => {
              const node = e.target as Konva.Rect;
              const sx = node.scaleX();
              const sy = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);
              const nx = node.x();
              const ny = node.y();
              const nw = node.width() * sx;
              const nh = node.height() * sy;
              onUpdateShape(shape.id, {
                latlngs: [
                  unproject({ x: nx, y: ny }),
                  unproject({ x: nx + nw, y: ny + nh }),
                ],
              });
            }}
          />
        );
      }
      return (
        <Ellipse
          key={shape.id}
          id={shape.id}
          ref={isDraft ? undefined : registerRef(shape.id)}
          draggable={draggable}
          onClick={selectShape}
          onTap={selectShape}
          {...blockStage}
          x={x + w / 2}
          y={y + h / 2}
          radiusX={w / 2}
          radiusY={h / 2}
          stroke={shape.color}
          strokeWidth={shape.strokeWidth}
          onDragEnd={onDragEnd}
          onTransformEnd={(e) => {
            const node = e.target as Konva.Ellipse;
            const sx = node.scaleX();
            const sy = node.scaleY();
            node.scaleX(1);
            node.scaleY(1);
            const rx = node.radiusX() * sx;
            const ry = node.radiusY() * sy;
            const cx = node.x();
            const cy = node.y();
            onUpdateShape(shape.id, {
              latlngs: [
                unproject({ x: cx - rx, y: cy - ry }),
                unproject({ x: cx + rx, y: cy + ry }),
              ],
            });
          }}
        />
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
          size={shape.size ?? 32}
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
        fontSize={shape.fontSize}
        fill={shape.color}
        rotation={shape.rotation}
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
            rotation: node.rotation(),
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
        fontSize: shape.fontSize ?? 16,
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
