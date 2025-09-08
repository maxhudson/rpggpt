import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import useImage from 'use-image';
import K from '@/k';

const Image = dynamic(() => import('react-konva').then(mod => ({ default: mod.Image })), { ssr: false });
const Ellipse = dynamic(() => import('react-konva').then(mod => ({ default: mod.Ellipse })), { ssr: false });
const Group = dynamic(() => import('react-konva').then(mod => ({ default: mod.Group })), { ssr: false });
const Rect = dynamic(() => import('react-konva').then(mod => ({ default: mod.Rect })), { ssr: false });
const Transformer = dynamic(() => import('react-konva').then(mod => ({ default: mod.Transformer })), { ssr: false });
const Konva = dynamic(() => import('konva'), { ssr: false });

export default function MapObject({ elementId, elementTypeId, x, y, elementType, playerPosition, stageSize, isEditing, isSelected, onUpdatePosition, onSelect, onDragStart, onDragMove, onDragEnd }) {
  // Generate dynamic image URL from Supabase storage
  const imageUrl = elementTypeId && elementTypeId !== 'preview-current' && !elementTypeId.startsWith('preview-option-')
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/element_types/${elementTypeId}/image.png${elementType.data.imageTimestamp ? `?t=${elementType.data.imageTimestamp}` : ''}`
    : elementType.data.imageData; // Only for preview purposes

  const [image] = useImage(imageUrl);
  const [isDragging, setIsDragging] = useState(false);
  const groupRef = useRef();
  const transformerRef = useRef();
  const isShiftPressed = useRef(false);

  // Snap to grid function - snaps to world grid, not relative to player
  const snapToGrid = K.snapToGrid;

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

  const {
    originalWidth,
    originalHeight,
    width = 1, // Width in grid units (1 = 20px)
    offsetX = 0,
    offsetY = 0,
    collisionRadius = 0.25,
    shadowRadius = 0.5,
    saturation = 1, // 0-1, where 1 is full saturation, 0 is grayscale
    yScale = 1 // 0-infinity, where 1 is default, 0.5 is half height, 2 is double height
  } = elementType.data;

  // Calculate display dimensions
  const displayWidth = width * K.gridSize;
  const baseDisplayHeight = (originalHeight && originalWidth) ?
    displayWidth * (originalHeight / originalWidth) : displayWidth;
  const displayHeight = baseDisplayHeight * yScale;

  // Calculate position relative to player and center on screen
  const screenCenterX = stageSize.width / 2;
  const screenCenterY = stageSize.height / 2;

  const relativeX = x - playerPosition.x;
  const relativeY = y - playerPosition.y;

  const screenX = screenCenterX + relativeX;
  const screenY = screenCenterY + relativeY; // Center vertically

  // Calculate shadow dimensions
  const shadowWidth = displayWidth * shadowRadius * 2;
  const shadowHeight = shadowWidth * 0.5; // Make shadow elliptical

  const handleDragStart = (e) => {
    setIsDragging(true);

    // Use shared drag handlers if available, otherwise fall back to local handling
    if (onDragStart) {
      const node = e.target;
      const worldX = node.x() - screenCenterX + playerPosition.x;
      const worldY = node.y() - screenCenterY + playerPosition.y;
      onDragStart(elementId, { x: worldX, y: worldY });
    }
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);

    if (!isEditing) return;

    const node = e.target;
    // Convert from screen coordinates to world coordinates
    const worldX = node.x() - screenCenterX + playerPosition.x;
    const worldY = node.y() - screenCenterY + playerPosition.y;

    // Use shared drag handlers if available, otherwise fall back to local handling
    if (onDragEnd) {
      onDragEnd(elementId, { x: worldX, y: worldY });
    } else if (onUpdatePosition) {
      // Fallback to old system
      onUpdatePosition(elementId, { x: worldX, y: worldY });
    }
  };

  const handleClick = (e) => {
    if (!isEditing) return;

    // Prevent event bubbling
    e.cancelBubble = true;

    if (onSelect) {
      onSelect(elementId);
    }
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
          const worldX = pos.x - screenCenterX + playerPosition.x;
          const worldY = pos.y - screenCenterY + playerPosition.y;

          // Only snap to grid when shift is pressed
          if (isShiftPressed.current) {
            const snappedWorldX = snapToGrid(worldX);
            const snappedWorldY = snapToGrid(worldY);

            // Convert back to screen coordinates
            return {
              x: screenCenterX + (snappedWorldX - playerPosition.x),
              y: screenCenterY + (snappedWorldY - playerPosition.y)
            };
          }

          // No snapping - return original position
          return pos;
        }}
      >
        {/* Shadow */}
        {shadowRadius > 0 && (
          <Ellipse
            x={0}
            y={0} // Position shadow below object
            radiusX={shadowWidth / 2}
            radiusY={shadowHeight / 2}
            fill={isSelected || isDragging ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.1)"}
            opacity={0.6}
          />
        )}

        {/* Element image */}
        {image && (
          <Image
            image={image}
            x={-displayWidth / 2 + (displayWidth * offsetX)}
            y={-displayHeight + K.gridSize / 2 + (displayHeight * offsetY)}
            width={displayWidth}
            height={displayHeight}
            // filters={saturation !== 1 ? [Konva.filters.HSV] : []}
            // saturation={saturation}
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

      {/* Transformer for selected elements */}
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
              // Convert screen position to world coordinates
              const worldX = node.x() - screenCenterX + playerPosition.x;
              const worldY = node.y() - screenCenterY + playerPosition.y;

              // Only snap to grid when shift is pressed
              const newX = isShiftPressed.current ? snapToGrid(worldX) : worldX;
              const newY = isShiftPressed.current ? snapToGrid(worldY) : worldY;

              // Update position in world coordinates
              onUpdatePosition(elementId, { x: newX, y: newY });
            }
          }}
        />
      )}
    </>
  );
}
