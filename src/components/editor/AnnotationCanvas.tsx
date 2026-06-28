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
  Transformer,
} from "react-konva";
import Konva from "konva";
import type { Shape, ToolKind } from "../../types";
import { newId } from "../../store/projects";

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
  onSelect: (id: string | null) => void;
  onAddShape: (shape: Shape) => void;
  onUpdateShape: (id: string, patch: Partial<Shape>) => void;
}

const TRANSFORMABLE: Shape["type"][] = ["rect", "ellipse", "text", "symbol"];

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
  onSelect,
  onAddShape,
  onUpdateShape,
}: Props) {
  const [draft, setDraft] = useState<Shape | null>(null);
  const drawing = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());

  // Attache le Transformer à la forme sélectionnée (déplaçable/redimensionnable).
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const shape = shapes.find((s) => s.id === selectedId);
    if (tool !== "select" || !shape || !TRANSFORMABLE.includes(shape.type)) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const node = nodeRefs.current.get(selectedId!);
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, tool, shapes]);

  function pointer(): { x: number; y: number } | null {
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

    if (tool === "text") {
      const value = window.prompt("Texte à ajouter :");
      if (value)
        onAddShape({
          id: newId(),
          type: "text",
          x: pos.x,
          y: pos.y,
          text: value,
          fontSize: Math.max(16, strokeWidth * 6),
          color,
          strokeWidth,
        });
      return;
    }

    if (tool === "symbol") {
      onAddShape({
        id: newId(),
        type: "symbol",
        x: pos.x,
        y: pos.y,
        text: currentSymbol,
        fontSize: 28 + strokeWidth * 4,
        color,
        strokeWidth,
      });
      return;
    }

    drawing.current = true;
    startPos.current = pos;
    const base = { id: newId(), color, strokeWidth };

    if (tool === "pen") {
      setDraft({ ...base, type: "pen", points: [pos.x, pos.y] });
    } else if (tool === "line" || tool === "arrow") {
      setDraft({ ...base, type: tool, points: [pos.x, pos.y, pos.x, pos.y] });
    } else if (tool === "rect" || tool === "ellipse") {
      setDraft({ ...base, type: tool, x: pos.x, y: pos.y, width: 0, height: 0 });
    }
  }

  function handleMove() {
    if (!drawing.current || !draft) return;
    const pos = pointer();
    if (!pos) return;

    if (draft.type === "pen") {
      setDraft({ ...draft, points: [...(draft.points ?? []), pos.x, pos.y] });
    } else if (draft.type === "line" || draft.type === "arrow") {
      const [x0, y0] = draft.points ?? [pos.x, pos.y];
      setDraft({ ...draft, points: [x0, y0, pos.x, pos.y] });
    } else if (draft.type === "rect" || draft.type === "ellipse") {
      const start = startPos.current!;
      setDraft({
        ...draft,
        x: start.x,
        y: start.y,
        width: pos.x - start.x,
        height: pos.y - start.y,
      });
    }
  }

  function handleUp() {
    drawing.current = false;
    startPos.current = null;
    if (!draft) return;

    let shape = draft;
    // Normalise les rectangles/ellipses dessinés « à l'envers ».
    if (shape.type === "rect" || shape.type === "ellipse") {
      const w = shape.width ?? 0;
      const h = shape.height ?? 0;
      shape = {
        ...shape,
        x: w < 0 ? (shape.x ?? 0) + w : shape.x,
        y: h < 0 ? (shape.y ?? 0) + h : shape.y,
        width: Math.abs(w),
        height: Math.abs(h),
      };
      if ((shape.width ?? 0) < 4 && (shape.height ?? 0) < 4) {
        setDraft(null);
        return;
      }
    }
    if (shape.type === "pen" && (shape.points?.length ?? 0) < 4) {
      setDraft(null);
      return;
    }
    onAddShape(shape);
    setDraft(null);
  }

  // Réintègre le déplacement d'une polyligne dans ses points.
  function bakeLineDrag(node: Konva.Node, shape: Shape) {
    const dx = node.x();
    const dy = node.y();
    const pts = (shape.points ?? []).map((p, i) =>
      i % 2 === 0 ? p + dx : p + dy,
    );
    node.position({ x: 0, y: 0 });
    onUpdateShape(shape.id, { points: pts });
  }

  function registerRef(id: string) {
    return (node: Konva.Node | null) => {
      if (node) nodeRefs.current.set(id, node);
      else nodeRefs.current.delete(id);
    };
  }

  function renderShape(shape: Shape, isDraft = false) {
    const draggable = tool === "select" && !isDraft;
    const common = {
      ref: isDraft ? undefined : registerRef(shape.id),
      draggable,
      onClick: () => tool === "select" && onSelect(shape.id),
      onTap: () => tool === "select" && onSelect(shape.id),
    };

    switch (shape.type) {
      case "pen":
      case "line":
        return (
          <Line
            key={shape.id}
            {...common}
            points={shape.points}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            lineCap="round"
            lineJoin="round"
            tension={shape.type === "pen" ? 0.3 : 0}
            hitStrokeWidth={Math.max(14, shape.strokeWidth)}
            onDragEnd={(e) => bakeLineDrag(e.target, shape)}
          />
        );
      case "arrow":
        return (
          <Arrow
            key={shape.id}
            {...common}
            points={shape.points ?? []}
            stroke={shape.color}
            fill={shape.color}
            strokeWidth={shape.strokeWidth}
            pointerLength={10 + shape.strokeWidth}
            pointerWidth={10 + shape.strokeWidth}
            onDragEnd={(e) => bakeLineDrag(e.target, shape)}
          />
        );
      case "rect":
        return (
          <Rect
            key={shape.id}
            {...common}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            rotation={shape.rotation}
            onDragEnd={(e) =>
              onUpdateShape(shape.id, { x: e.target.x(), y: e.target.y() })
            }
            onTransformEnd={(e) => {
              const node = e.target as Konva.Rect;
              const sx = node.scaleX();
              const sy = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);
              onUpdateShape(shape.id, {
                x: node.x(),
                y: node.y(),
                width: Math.max(4, node.width() * sx),
                height: Math.max(4, node.height() * sy),
                rotation: node.rotation(),
              });
            }}
          />
        );
      case "ellipse": {
        const w = shape.width ?? 0;
        const h = shape.height ?? 0;
        return (
          <Ellipse
            key={shape.id}
            {...common}
            x={(shape.x ?? 0) + w / 2}
            y={(shape.y ?? 0) + h / 2}
            radiusX={w / 2}
            radiusY={h / 2}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            rotation={shape.rotation}
            onDragEnd={(e) =>
              onUpdateShape(shape.id, {
                x: e.target.x() - w / 2,
                y: e.target.y() - h / 2,
              })
            }
            onTransformEnd={(e) => {
              const node = e.target as Konva.Ellipse;
              const sx = node.scaleX();
              const sy = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);
              const newW = Math.max(4, node.radiusX() * 2 * sx);
              const newH = Math.max(4, node.radiusY() * 2 * sy);
              onUpdateShape(shape.id, {
                x: node.x() - newW / 2,
                y: node.y() - newH / 2,
                width: newW,
                height: newH,
                rotation: node.rotation(),
              });
            }}
          />
        );
      }
      case "text":
      case "symbol":
        return (
          <Text
            key={shape.id}
            {...common}
            x={shape.x}
            y={shape.y}
            text={shape.text}
            fontSize={shape.fontSize}
            fill={shape.color}
            rotation={shape.rotation}
            onDragEnd={(e) =>
              onUpdateShape(shape.id, { x: e.target.x(), y: e.target.y() })
            }
            onTransformEnd={(e) => {
              const node = e.target as Konva.Text;
              const sx = node.scaleX();
              node.scaleX(1);
              node.scaleY(1);
              onUpdateShape(shape.id, {
                x: node.x(),
                y: node.y(),
                fontSize: Math.max(8, (shape.fontSize ?? 16) * sx),
                rotation: node.rotation(),
              });
            }}
          />
        );
      default:
        return null;
    }
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
      style={{ cursor: tool === "select" ? "default" : "crosshair" }}
    >
      <Layer>
        {shapes.map((s) => renderShape(s))}
        {draft && renderShape(draft, true)}
        <Transformer
          ref={trRef}
          rotateEnabled
          ignoreStroke
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 6 || newBox.height < 6 ? oldBox : newBox
          }
        />
      </Layer>
    </Stage>
  );
}
