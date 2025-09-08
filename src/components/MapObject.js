import { useEffect, useState, useRef, memo } from 'react';
import dynamic from 'next/dynamic';
import useImage from 'use-image';
import K from '@/k';

const Image = dynamic(() => import('react-konva').then(mod => ({ default: mod.Image })), { ssr: false });
const Ellipse = dynamic(() => import('react-konva').then(mod => ({ default: mod.Ellipse })), { ssr: false });
const Group = dynamic(() => import('react-konva').then(mod => ({ default: mod.Group })), { ssr: false });
const Rect = dynamic(() => import('react-konva').then(mod => ({ default: mod.Rect })), { ssr: false });
const Transformer = dynamic(() => import('react-konva').then(mod => ({ default: mod.Transformer })), { ssr: false });
const Konva = dynamic(() => import('konva'), { ssr: false });

function MapObject({ elementId, elementTypeId, x, y, elementType, playerPosition, stageSize, isEditing, isSelected, onUpdatePosition, onSelect, onDragStart, onDragMove, onDragEnd }) {
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

  // Use world coordinates directly since we're using stage offset
  const worldX = x;
  const worldY = y;

  // Calculate shadow dimensions
  const shadowWidth = displayWidth * shadowRadius * 2;
  const shadowHeight = shadowWidth * 0.5; // Make shadow elliptical

  const handleDragStart = (e) => {
    setIsDragging(true);

    // Use shared drag handlers if available, otherwise fall back to local handling
    if (onDragStart) {
      const node = e.target;
      onDragStart(elementId, { x: node.x(), y: node.y() });
    }
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);

    if (!isEditing) return;

    const node = e.target;
    // Use world coordinates directly
    const worldX = node.x();
    const worldY = node.y();

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
        x={worldX}
        y={worldY}
        draggable={isEditing}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        onTap={handleClick}
        dragBoundFunc={(pos) => {
          if (!isEditing) return pos;

          // Use world coordinates directly
          const worldX = pos.x;
          const worldY = pos.y;

          // Only snap to grid when shift is pressed
          if (isShiftPressed.current) {
            const snappedWorldX = snapToGrid(worldX);
            const snappedWorldY = snapToGrid(worldY);

            return {
              x: snappedWorldX,
              y: snappedWorldY
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
              // Use world coordinates directly
              const worldX = node.x();
              const worldY = node.y();

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

// Custom comparison function for React.memo
const areEqual = (prevProps, nextProps) => {
  const changedProps = [];

  // Check each prop for changes
  if (prevProps.elementId !== nextProps.elementId) changedProps.push('elementId');
  if (prevProps.elementTypeId !== nextProps.elementTypeId) changedProps.push('elementTypeId');
  if (prevProps.x !== nextProps.x) changedProps.push('x');
  if (prevProps.y !== nextProps.y) changedProps.push('y');
  if (prevProps.isEditing !== nextProps.isEditing) changedProps.push('isEditing');
  if (prevProps.isSelected !== nextProps.isSelected) changedProps.push('isSelected');

  // Deep compare elementType
  if (JSON.stringify(prevProps.elementType) !== JSON.stringify(nextProps.elementType)) {
    changedProps.push('elementType');
  }

  // Compare playerPosition
  // if (prevProps.playerPosition?.x !== nextProps.playerPosition?.x ||
  //     prevProps.playerPosition?.y !== nextProps.playerPosition?.y) {
  //   changedProps.push('playerPosition');
  // }


  // Log what changed
  if (changedProps.length > 0) {
    console.log(`MapObject ${prevProps.elementId} rerendering due to changed props:`, changedProps);
  }

  // Return true if props are equal (no rerender needed)
  return changedProps.length === 0;
};

export default memo(MapObject, areEqual);
