import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import useImage from 'use-image';

const Image = dynamic(() => import('react-konva').then(mod => ({ default: mod.Image })), { ssr: false });
const Ellipse = dynamic(() => import('react-konva').then(mod => ({ default: mod.Ellipse })), { ssr: false });
const Group = dynamic(() => import('react-konva').then(mod => ({ default: mod.Group })), { ssr: false });
const Rect = dynamic(() => import('react-konva').then(mod => ({ default: mod.Rect })), { ssr: false });
const Transformer = dynamic(() => import('react-konva').then(mod => ({ default: mod.Transformer })), { ssr: false });

export default function MapObject({ uuid, mapObject, objectType, playerPosition, stageSize, zoom, offset, isEditing, onUpdatePosition, onDragStart, onDragMove, onDragEnd }) {
  const [image] = useImage(objectType?.imageData);
  const [isSelected, setIsSelected] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const groupRef = useRef();
  const transformerRef = useRef();

  // Grid snap size
  const GRID_SIZE = 20;

  // Snap to grid function - snaps to world grid, not relative to player
  const snapToGrid = (value) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // Handle selection
  useEffect(() => {
    if (isSelected && transformerRef.current && groupRef.current) {
      // Add a small delay to ensure the transformer is fully loaded
      const timer = setTimeout(() => {
        if (transformerRef.current && transformerRef.current.nodes && groupRef.current) {
          try {
            transformerRef.current.nodes([groupRef.current]);
            transformerRef.current.getLayer()?.batchDraw();
          } catch (error) {
            console.warn('Transformer error:', error);
          }
        }
      }, 10);

      return () => clearTimeout(timer);
    }
  }, [isSelected]);

  if (!mapObject) return null;

  // Handle missing objectType - render as black rectangle
  if (!objectType) {
    const screenCenterX = stageSize.width / 2;
    const screenCenterY = stageSize.height / 2;
    const relativeX = mapObject.x - playerPosition.x;
    const relativeY = mapObject.y - playerPosition.y;
    const screenX = screenCenterX + relativeX;
    const screenY = screenCenterY + relativeY;

    return (
      <Group
        x={screenX}
        y={screenY}
        draggable={isEditing}
        onDragEnd={(e) => {
          if (!isEditing || !onUpdatePosition) return;
          const node = e.target;
          const newX = snapToGrid(node.x() - screenCenterX + playerPosition.x);
          const newY = snapToGrid(node.y() - screenCenterY + playerPosition.y);
          onUpdatePosition(uuid, { x: newX, y: newY });
        }}
        dragBoundFunc={(pos) => {
          if (!isEditing) return pos;
          const worldX = pos.x - screenCenterX + playerPosition.x;
          const worldY = pos.y - screenCenterY + playerPosition.y;
          const snappedWorldX = snapToGrid(worldX);
          const snappedWorldY = snapToGrid(worldY);
          return {
            x: screenCenterX + (snappedWorldX - playerPosition.x),
            y: screenCenterY + (snappedWorldY - playerPosition.y)
          };
        }}
      >
        <Rect
          x={-10}
          y={-10}
          width={20}
          height={20}
          fill="black"
        />
      </Group>
    );
  }

  const {
    originalWidth,
    originalHeight,
    scale = 1,
    offsetX = 0,
    offsetY = 0,
    collisionRadius = 0.25,
    shadowRadius = 0.5
  } = objectType;

  // Calculate display dimensions - materials are always 30px
  const isMaterial = (objectType.type || 'object') === 'material';
  const displayWidth = isMaterial ? 20 : originalWidth * scale;
  const displayHeight = isMaterial ? 20 : originalHeight * scale;

  // Calculate position relative to player and center on screen
  const screenCenterX = stageSize.width / 2;
  const screenCenterY = stageSize.height / 2;

  const relativeX = mapObject.x - playerPosition.x;
  const relativeY = mapObject.y - playerPosition.y;

  const screenX = screenCenterX + relativeX;
  const screenY = screenCenterY + relativeY;

  // Calculate shadow dimensions
  const shadowWidth = displayWidth * shadowRadius * 2;
  const shadowHeight = shadowWidth * 0.5; // Make shadow elliptical

  const handleDragStart = (e) => {
    setIsDragging(true);

    // Use shared drag handlers if available, otherwise fall back to local handling
    if (onDragStart) {
      const node = e.target;
      const worldX = (node.x() - offset.x) / zoom - screenCenterX + playerPosition.x;
      const worldY = (node.y() - offset.y) / zoom - screenCenterY + playerPosition.y;
      onDragStart(uuid, { x: worldX, y: worldY });
    }
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);

    if (!isEditing) return;

    const node = e.target;
    // Use the exact inverse of dragBoundFunc conversion
    // Step 1: Convert from screen coordinates to stage coordinates
    const stageX = (node.x() - offset.x) / zoom;
    const stageY = (node.y() - offset.y) / zoom;
    // Step 2: Convert from stage coordinates to world coordinates
    const worldX = stageX - screenCenterX + playerPosition.x;
    const worldY = stageY - screenCenterY + playerPosition.y;

    // Use shared drag handlers if available, otherwise fall back to local handling
    if (onDragEnd) {
      onDragEnd(uuid, { x: worldX, y: worldY });
    } else if (onUpdatePosition) {
      // Fallback to old system
      onUpdatePosition(uuid, { x: worldX, y: worldY });
    }
  };

  const handleClick = (e) => {
    if (!isEditing) return;

    // Prevent event bubbling
    e.cancelBubble = true;

    setIsSelected(!isSelected);
  };

  return (
    <>
      <Group
        ref={groupRef}
        x={screenX}
        y={screenY}
        draggable={isEditing}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        onTap={handleClick}
        dragBoundFunc={(pos) => {
          if (!isEditing) return pos;

          // Convert screen position to world coordinates
          // Account for zoom offset: pos is in stage coordinates, need to convert to world
          const stageX = (pos.x - offset.x) / zoom;
          const stageY = (pos.y - offset.y) / zoom;
          const worldX = stageX - screenCenterX + playerPosition.x;
          const worldY = stageY - screenCenterY + playerPosition.y;

          // Snap to grid
          const snappedWorldX = snapToGrid(worldX);
          const snappedWorldY = snapToGrid(worldY);

          // Convert back to screen coordinates
          const stageSnappedX = screenCenterX + (snappedWorldX - playerPosition.x);
          const stageSnappedY = screenCenterY + (snappedWorldY - playerPosition.y);
          return {
            x: stageSnappedX * zoom + offset.x,
            y: stageSnappedY * zoom + offset.y
          };
        }}
      >
        {/* Shadow - only for objects, not materials */}
        {shadowRadius > 0 && !isMaterial && (
          <Ellipse
            x={0}
            y={displayHeight * 0.4} // Position shadow below object
            radiusX={shadowWidth / 2}
            radiusY={shadowHeight / 2}
            fill={isSelected || isDragging ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.1)"}
            opacity={0.6}
          />
        )}

        {/* Object image */}
        {image && (
          <Image
            image={image}
            x={-displayWidth / 2 + (displayWidth * offsetX)}
            y={(objectType.type || 'object') === 'material' ?
              (-displayHeight + (displayHeight * offsetY)) :
              (-displayHeight / 2 + (displayHeight * offsetY))}
            width={displayWidth}
            height={displayHeight}
          />
        )}

        {/* Collision area for debugging (optional) */}
        {/* {collisionRadius > 0 && process.env.NODE_ENV === 'development' && (
          <Ellipse
            x={0}
            y={displayHeight * 0.4}
            radiusX={displayWidth * collisionRadius}
            radiusY={displayWidth * collisionRadius * 0.5}
            stroke="red"
            strokeWidth={1}
            opacity={0.5}
          />
        )} */}
      </Group>

      {/* Transformer for selected objects */}
      {isSelected && isEditing && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
          enabledAnchors={[]}
          rotateEnabled={false}
          onTransformEnd={(e) => {
            const node = transformerRef.current.nodes()[0];
            if (node && onUpdatePosition) {
              const newX = snapToGrid(node.x() - screenCenterX + playerPosition.x);
              const newY = snapToGrid(node.y() - screenCenterY + playerPosition.y);

              // Update position in world coordinates
              onUpdatePosition(uuid, { x: newX, y: newY });
            }
          }}
        />
      )}
    </>
  );
}
