import { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Path = dynamic(() => import('react-konva').then(mod => ({ default: mod.Path })), { ssr: false });
const Circle = dynamic(() => import('react-konva').then(mod => ({ default: mod.Circle })), { ssr: false });

export default function EditablePath({
  polygonId,
  polygon,
  isEditing,
  isSelected,
  onPointDrag,
  onPolygonSelect,
  onPolygonDrag
}) {
  const isShiftPressed = useRef(false);
  const isDraggingPolygon = useRef(false);
  const dragStartPos = useRef(null);
  const originalPoints = useRef(null);
  const pathRef = useRef(null);

  // Track shift key state for conditional grid snapping
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') {
        isShiftPressed.current = true;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        isShiftPressed.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Grid snap function
  const snapToGrid = (value) => {
    const gridSize = 20;
    return Math.round(value / gridSize) * gridSize;
  };

  // Handle mouse down on polygon (start drag)
  const handleMouseDown = (e) => {
    if (!isEditing) return;

    e.cancelBubble = true;
    isDraggingPolygon.current = true;
    // Store the initial mouse position in screen coordinates
    dragStartPos.current = { x: e.evt.clientX, y: e.evt.clientY };
    originalPoints.current = [...polygon.points];
  };

  // Handle mouse move (during drag)
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingPolygon.current || !dragStartPos.current || !originalPoints.current) return;

      // Calculate delta in screen coordinates
      const screenDeltaX = e.clientX - dragStartPos.current.x;
      const screenDeltaY = e.clientY - dragStartPos.current.y;

      // Convert screen delta to world delta (no camera offset needed since it's just a delta)
      const worldDeltaX = screenDeltaX;
      const worldDeltaY = screenDeltaY;

      // Apply grid snapping if shift is pressed
      const finalDeltaX = isShiftPressed.current ? snapToGrid(worldDeltaX) : worldDeltaX;
      const finalDeltaY = isShiftPressed.current ? snapToGrid(worldDeltaY) : worldDeltaY;

      // Calculate new points by adding delta to original points
      const newPoints = originalPoints.current.map(([x, y]) => [
        x + finalDeltaX,
        y + finalDeltaY
      ]);

      if (onPolygonDrag) {
        onPolygonDrag(polygonId, newPoints);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingPolygon.current) {
        isDraggingPolygon.current = false;
        dragStartPos.current = null;
        originalPoints.current = null;
      }
    };

    if (isDraggingPolygon.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPolygon.current, onPolygonDrag, polygonId]);

  if (!polygon || polygon.type !== 'path' || !polygon.points || polygon.points.length < 3) {
    return null;
  }

  // Create SVG path string directly from world coordinates (stage handles offset)
  const pathData = polygon.points.reduce((path, [worldX, worldY], index) => {
    if (index === 0) {
      return `M ${worldX} ${worldY}`;
    } else {
      return `${path} L ${worldX} ${worldY}`;
    }
  }, '') + ' Z'; // Close the path

  return (
    <>
      {/* Render the polygon path */}
      <Path
        ref={pathRef}
        key={`background-${polygonId}`}
        data={pathData}
        fill={polygon.fill || 'gray'}
        stroke={isSelected ? '#FFD700' : 'transparent'}
        strokeWidth={isSelected ? 3 : 0}
        listening={isEditing}
        onClick={() => {
          if (isEditing && onPolygonSelect) {
            onPolygonSelect(polygonId);
          }
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={(e) => {
          if (isEditing) {
            e.target.getStage().container().style.cursor = isDraggingPolygon.current ? 'grabbing' : 'grab';
          }
        }}
        onMouseLeave={(e) => {
          if (isEditing) {
            e.target.getStage().container().style.cursor = 'default';
          }
        }}
      />

      {/* Render draggable points when in editing mode and selected */}
      {isEditing && isSelected && polygon.points.map(([worldX, worldY], pointIndex) => {
        return (
          <Circle
            key={`background-${polygonId}-point-${pointIndex}`}
            x={worldX}
            y={worldY}
            radius={6}
            fill="#4CAF50"
            stroke="#ffffff"
            strokeWidth={2}
            draggable={true}
            onDragMove={(e) => {
              // e.target.x() and e.target.y() are already in world coordinates since stage handles offset
              const worldPos = { x: e.target.x(), y: e.target.y() };
              onPointDrag(polygonId, pointIndex, worldPos, isShiftPressed.current);
            }}
            onMouseEnter={(e) => {
              e.target.getStage().container().style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              e.target.getStage().container().style.cursor = 'default';
            }}
          />
        );
      })}
    </>
  );
}
