import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import MapSimpleObject from './MapSimpleObject';
import MapSimpleCharacter from './MapSimpleCharacter';
import { cellSize } from '../k';
import sprites from '../sprites';
import { findNearestObject } from '../game-page/helpers';

const Stage = dynamic(() => import('react-konva').then(mod => ({ default: mod.Stage })), { ssr: false });
const Layer = dynamic(() => import('react-konva').then(mod => ({ default: mod.Layer })), { ssr: false });
const Ellipse = dynamic(() => import('react-konva').then(mod => ({ default: mod.Ellipse })), { ssr: false });
const Rect = dynamic(() => import('react-konva').then(mod => ({ default: mod.Rect })), { ssr: false });

export default function MapSimple({
  activeLocation,
  activeCharacter,
  stageSize,
  onPositionUpdate,
  gameElements
}) {
  const keysPressed = useRef({});
  const playerPositionRef = useRef(null);
  const [, forceUpdate] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const stageRef = useRef(null);

  // Initialize player position from character's location
  useEffect(() => {
    if (activeLocation && activeLocation.characters && !playerPositionRef.current) {
      const characterData = activeLocation.characters[activeCharacter];
      if (characterData) {
        playerPositionRef.current = { x: characterData.x, y: characterData.y };
        forceUpdate(prev => prev + 1);
      }
    }
  }, [activeLocation, activeCharacter]);

  useEffect(() => {
    const moveSpeed = 0.025;

    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    const updatePlayerPosition = () => {
      // Don't move player if user is typing in an input field
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );

      if (isInputFocused) {
        setIsWalking(false);
        return;
      }

      let deltaX = 0;
      let deltaY = 0;

      if (keysPressed.current['w'] || keysPressed.current['arrowup']) deltaY -= moveSpeed;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) deltaY += moveSpeed;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) deltaX -= moveSpeed;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) deltaX += moveSpeed;

      if ((deltaX !== 0 || deltaY !== 0) && playerPositionRef.current) {
        const newPosition = {
          x: playerPositionRef.current.x + deltaX,
          y: playerPositionRef.current.y + deltaY
        };
        playerPositionRef.current = newPosition;
        forceUpdate(prev => prev + 1);
        setIsWalking(true);

        // Notify parent component of position change if callback provided
        if (onPositionUpdate) {
          onPositionUpdate(newPosition);
        }
      } else {
        setIsWalking(false);
      }
    };

    const intervalId = setInterval(updatePlayerPosition, 16); // ~60fps

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(intervalId);
    };
  }, []);

  if (!activeLocation || !activeLocation.elementInstances || !playerPositionRef.current) {
    return <div>Loading map...</div>;
  }

  // Get player position from ref
  const playerPosition = playerPositionRef.current;

  // Find the nearest object to the character
  const nearestObject = findNearestObject(activeLocation, activeCharacter);
  const nearestInstanceId = nearestObject?.instanceId;

  // Get all element instances (no need to filter characters anymore)
  const elementInstances = Object.entries(activeLocation.elementInstances);

  // Sort by Y position for depth
  const sortedElements = [...elementInstances].sort((a, b) => a[1].y - b[1].y);

  const yScale = 0.75; // 45-degree camera angle
  var offset = {
    x: stageSize.width / 2 + -playerPosition.x * cellSize,
    y: stageSize.height / 2 + -playerPosition.y * cellSize * yScale
  };

  // Calculate background position for infinite checkerboard
  const bgX = offset.x % (cellSize * 2);
  const bgY = (offset.y) % (cellSize * 2);

  return (
    <Stage
      ref={stageRef}
      width={stageSize.width}
      height={stageSize.height}
      style={{
        background: 'linear-gradient(to top left, #a3b488, #afb98dff)'
      }}
    >
      <Layer>
        {/* Render shadows for all elements */}
        {sortedElements.map(([instanceId, instance]) => {
          const spriteConfig = sprites[instance.element] || {};
          const width = cellSize * (spriteConfig.width || 1);
          const shadowScale = spriteConfig.shadowScale || 1;
          var height = width * yScale;

          // Full opacity only for the nearest object, reduced for all others
          const isNearest = instanceId === nearestInstanceId;
          const opacity = isNearest ? 0.5 : 0.25;

          return (<>
            <Rect
              key={`shadow-${instanceId}`}
              x={offset.x + instance.x * cellSize + 1}
              y={offset.y + (instance.y * cellSize) * yScale + 1}
              width={width - 2}
              height={height - 2}
              fill={`rgba(0, 0, 0, ${opacity * 0.2})`}
            />
            {sprites[instance.element] && spriteConfig.shadowScale !== 0 && (<Ellipse
              x={offset.x + instance.x * cellSize + width / 2}
              y={offset.y + (instance.y * cellSize) * yScale + height / 2}
              radiusX={width / 2 * shadowScale}
              radiusY={height / 2 * shadowScale}
              fill={`rgba(0, 0, 0, 0.1)`}
              opacity={(spriteConfig.shadowOpacity || 1)}
            />)}
          </>);
        })}

        {/* Shadow for player character */}
        <Ellipse
          x={stageSize.width / 2}
          y={stageSize.height / 2 + 1}
          radiusX={cellSize / 6}
          radiusY={cellSize / 6 * yScale}
          fill="rgba(0, 0, 0, 0.1)"
        />

        {/* Render all element instances */}
        {sortedElements.map(([instanceId, instance]) => {
          const displayText = instance.element + (instance.level ? ` L${instance.level}` : '');

          // Full opacity only for the nearest object, reduced for all others
          const isNearest = instanceId === nearestInstanceId;
          const opacity = isNearest ? 1 : 0.4;

          // Get color from element definition
          const elementDef = gameElements?.[instance.collection]?.[instance.element];

          return (
            <MapSimpleObject
              key={instanceId}
              instance={instance}
              instanceId={instanceId}
              elementDef={elementDef}
              x={offset.x + instance.x * cellSize}
              y={offset.y + (instance.y * cellSize * yScale)}
              opacity={opacity}
              displayText={displayText}
            />
          );
        })}

        {/* Render active character (player) on top */}
        <MapSimpleCharacter
          characterName={activeCharacter}
          x={stageSize.width / 2}
          y={stageSize.height / 2}
          isWalking={isWalking}
        />
      </Layer>
    </Stage>
  );
}
