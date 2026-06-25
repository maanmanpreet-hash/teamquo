import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Layer, Line, Rect, Stage, Text } from "react-konva";

import { createElevationPagePlan } from "@shared/elevationLayout";
import type { ElevationDocument } from "@shared/elevationScene";

type Props = {
  document: ElevationDocument;
  pageIndex?: number;
};

export function ElevationCanvasPage({ document, pageIndex = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const page = document.pages[pageIndex];
  const plan = useMemo(() => createElevationPagePlan(page, document), [document, page]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => setContainerWidth(node.clientWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scale = containerWidth > 0 ? Math.min(containerWidth / plan.width, 1) : 1;
  const stageWidth = plan.width * scale;
  const stageHeight = plan.height * scale;

  return (
    <div ref={containerRef} className="w-full overflow-x-auto bg-white">
      <Stage width={stageWidth} height={stageHeight} scaleX={scale} scaleY={scale}>
        <Layer>
          {plan.shapes.map((shape, index) => {
            const key = `${shape.kind}-${index}`;

            if (shape.kind === "rect") {
              return (
                <Rect
                  key={key}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  fill={shape.fill}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                  strokeOpacity={shape.strokeOpacity}
                  opacity={shape.fillOpacity}
                  cornerRadius={shape.radius}
                />
              );
            }

            if (shape.kind === "line") {
              return (
                <Line
                  key={key}
                  points={shape.points}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                  strokeOpacity={shape.strokeOpacity}
                  dash={shape.dash}
                  closed={shape.closed}
                  fill={shape.fill}
                />
              );
            }

            if (shape.kind === "circle") {
              return (
                <Circle
                  key={key}
                  x={shape.x}
                  y={shape.y}
                  radius={shape.radius}
                  fill={shape.fill}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                />
              );
            }

            return (
              <Text
                key={key}
                x={shape.x}
                y={shape.y}
                text={shape.text}
                fontSize={shape.fontSize}
                fontStyle={shape.fontWeight && shape.fontWeight >= 700 ? "bold" : "normal"}
                fill={shape.fill}
                align={shape.align}
                width={shape.width}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
