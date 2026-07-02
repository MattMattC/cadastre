import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  Stage,
  Layer,
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
  onSelect: () => void;
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
}

const TRANSFORMABLE: ShapeType[] = ["rect", "ellipse", "text", "symbol"];
const ROTATABLE: ShapeType[] = ["text", "symbol"];

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
}: Props) {
  const [draft, setDraft] = useState<Shape | null>(null);
  const drawing = useRef(false);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());

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

  function handleDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const pos = pointer();
    if (!pos) return;

    if (tool === "select") {
      if (e.target === e.target.getStage()) onSelect(null);
      return;
    }
    if (tool === "pan") return;

    const ll = unproject(pos);

    if (tool === "text") {
      const value = window.prompt("Texte à ajouter :");
      if (value)
        onAddShape({
          id: newId(),
          type: "text",
          latlng: ll,
          text: value,
          fontSize: Math.max(16, strokeWidth * 5),
          color,
          strokeWidth,
        });
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
    const draggable = tool === "select" && !isDraft;
    const interactive = {
      ref: isDraft ? undefined : registerRef(shape.id),
      draggable,
      onClick: () => tool === "select" && onSelect(shape.id),
      onTap: () => tool === "select" && onSelect(shape.id),
    };

    // Conversion des ancrages géo → pixels pour l'affichage courant.
    if (shape.type === "pen" || shape.type === "line" || shape.type === "arrow") {
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
      if (shape.type === "arrow") {
        return (
          <Arrow
            key={shape.id}
            {...interactive}
            points={flat}
            stroke={shape.color}
            fill={shape.color}
            strokeWidth={shape.strokeWidth}
            pointerLength={10 + shape.strokeWidth}
            pointerWidth={10 + shape.strokeWidth}
            hitStrokeWidth={Math.max(14, shape.strokeWidth)}
            onDragEnd={onDragEnd}
          />
        );
      }
      return (
        <Line
          key={shape.id}
          {...interactive}
          points={flat}
          stroke={shape.color}
          strokeWidth={shape.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={shape.type === "pen" ? 0.3 : 0}
          hitStrokeWidth={Math.max(14, shape.strokeWidth)}
          onDragEnd={onDragEnd}
        />
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
            {...interactive}
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
          {...interactive}
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
          onSelect={() => tool === "select" && onSelect(shape.id)}
          unproject={unproject}
          onUpdateShape={onUpdateShape}
        />
      );
    }
    return (
      <Text
        key={shape.id}
        {...interactive}
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

  return (
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
  );
}
