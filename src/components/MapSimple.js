import React, { useEffect, useState, useRef, memo } from 'react';
import dynamic from 'next/dynamic';
import MapSimpleObject from './MapSimpleObject';
import MapSimpleCharacter from './MapSimpleCharacter';
import Joystick from './Joystick';
import { cellSize } from '../k';
import sprites from '../sprites';
import { findNearestObject } from '../game-page/helpers';
import { updateAnimalPositions, calculateViewportBounds } from '../game-page/animalMovement';

const Stage = dynamic(() => import('react-konva').then(mod => ({ default: mod.Stage })), { ssr: false });
const Layer = dynamic(() => import('react-konva').then(mod => ({ default: mod.Layer })), { ssr: false });
const Ellipse = dynamic(() => import('react-konva').then(mod => ({ default: mod.Ellipse })), { ssr: false });
const Rect = dynamic(() => import('react-konva').then(mod => ({ default: mod.Rect })), { ssr: false });

// Memoized shadow components
const ObjectShadow = memo(function ObjectShadow({ instance, instanceId, isNearest }) {
  const spriteConfig = sprites[instance.element] || {};
  const width = cellSize * (spriteConfig.width || 1);
  const shadowScale = spriteConfig.shadowScale || 1;
  const height = width;
  const isAnimal = instance.collection === 'Animals';
  const opacity = isNearest ? 0.5 : 0.25;

  return (
    <>
      {!isAnimal && (
        <Rect
          key={`shadow-rect-${instanceId}`}
          x={instance.x * cellSize + 1}
          y={instance.y * cellSize + 1}
          width={width - 2}
          height={height - 2}
          fill={`rgba(0, 0, 0, ${opacity * 0.2})`}
          cornerRadius={5}
        />
      )}
      {sprites[instance.element] && spriteConfig.shadowScale !== 0 && (
        <Ellipse
          key={`shadow-ellipse-${instanceId}`}
          x={instance.x * cellSize + width / 2}
          y={instance.y * cellSize + height / 2}
          radiusX={width / 2 * shadowScale}
          radiusY={height / 2 * shadowScale}
          fill="rgba(0, 0, 0, 0.1)"
          opacity={spriteConfig.shadowOpacity || 1}
        />
      )}
    </>
  );
}, (prev, next) => {
  // Return true to SKIP re-render (when props are equal)
  // Return false to allow re-render (when props changed)
  const positionUnchanged =
    prev.instance.x === next.instance.x &&
    prev.instance.y === next.instance.y;
  const elementUnchanged = prev.instance.element === next.instance.element;
  const nearestUnchanged = prev.isNearest === next.isNearest;

  // Skip re-render only if ALL are unchanged
  return next.instance.collection !== 'Animals' && positionUnchanged && elementUnchanged && nearestUnchanged;
});

const CharacterShadow = memo(function CharacterShadow({ charData, entityId }) {
  return (
    <Ellipse
      key={`shadow-${entityId}`}
      x={charData.x * cellSize}
      y={charData.y * cellSize + 1}
      radiusX={cellSize / 6}
      radiusY={cellSize / 6}
      fill="rgba(0, 0, 0, 0.1)"
    />
  );
}, (prev, next) => {
  // Only re-render if position changes
  return (
    prev.charData.x === next.charData.x &&
    prev.charData.y === next.charData.y
  );
});

export default function MapSimple({
  game,
  gameRef,
  stageSize,
  onPositionUpdate,
  onMessage,
  onGameUpdate
}) {
  const keysPressed = useRef({});
  const playerPositionRef = useRef(null);
  const [, forceUpdate] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const joystickDirection = useRef({ x: 0, y: 0, speed: 0 });

  // Extract data from game (use gameRef for live updates, game prop for static data)
  const activeCharacterName = game?.instance?.activeCharacter;
  const activeLocationName = game?.instance?.activeLocation;
  const characterData = game?.instance?.characters?.[activeCharacterName];
  // Use gameRef.current for activeLocation to get real-time animal position updates
  const activeLocation = gameRef?.current?.instance?.locations?.[activeLocationName] || game?.instance?.locations?.[activeLocationName];
  const gameElements = game?.elements;

  // Initialize player position from character's data
  useEffect(() => {
    if (characterData && !playerPositionRef.current) {
      playerPositionRef.current = { x: characterData.x, y: characterData.y };
      forceUpdate(prev => prev + 1);
    }
  }, [characterData]);

  useEffect(() => {
    const baseMoveSpeed = 0.03;

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

      // Joystick input (takes priority if active)
      if (joystickDirection.current.x !== 0 || joystickDirection.current.y !== 0) {
        // Use joystick speed multiplier (1 or 2)
        const joystickSpeed = baseMoveSpeed * 2;
        deltaX = joystickDirection.current.x * joystickSpeed;
        deltaY = joystickDirection.current.y * joystickSpeed;
      } else {
        // Keyboard input (with shift for double speed)
        const moveSpeed = keysPressed.current['shift'] ? baseMoveSpeed * 2 : baseMoveSpeed;
        if (keysPressed.current['w'] || keysPressed.current['arrowup']) deltaY -= moveSpeed;
        if (keysPressed.current['s'] || keysPressed.current['arrowdown']) deltaY += moveSpeed;
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) deltaX -= moveSpeed;
        if (keysPressed.current['d'] || keysPressed.current['arrowright']) deltaX += moveSpeed;
      }

      // Normalize diagonal movement to prevent moving faster
      if (deltaX !== 0 && deltaY !== 0) {
        const diagonalFactor = 1 / Math.sqrt(2);
        deltaX *= diagonalFactor;
        deltaY *= diagonalFactor;
      }

      const playerMoved = (deltaX !== 0 || deltaY !== 0) && playerPositionRef.current;

      if (playerMoved) {
        const oldPosition = playerPositionRef.current;
        const newPosition = {
          x: playerPositionRef.current.x + deltaX,
          y: playerPositionRef.current.y + deltaY
        };

        // Check collision and apply sliding physics
        let finalPosition = { ...newPosition };

        // Helper function to check if a position collides
        // Returns collision info: { collides: boolean, elementCenter: {x, y}, collisionRadius: number }
        const checkCollision = (testPosition) => {
          // Get fresh location data from gameRef.current to avoid stale references
          const currentLocation = gameRef?.current?.instance?.locations?.[activeLocationName];

          // Check collision with element instances
          if (currentLocation?.elementInstances) {
            for (const instance of Object.values(currentLocation.elementInstances)) {
              const spriteConfig = sprites[instance.element] || {};
              const collisionRadius = (spriteConfig.width || 1) * (spriteConfig.shadowScale || 0.5) / 2;

              // Calculate center of the element
              const elementCenterX = instance.x + (spriteConfig.width || 1) / 2;
              const elementCenterY = instance.y + (spriteConfig.width || 1) / 2;

              // Calculate distance from player to element center
              const distance = Math.sqrt(
                Math.pow(testPosition.x - elementCenterX, 2) +
                Math.pow(testPosition.y - elementCenterY, 2)
              );

              // Check if player would be within the collision radius
              if (distance < collisionRadius) {
                return {
                  collides: true,
                  elementCenter: { x: elementCenterX, y: elementCenterY },
                  collisionRadius,
                  distance
                };
              }
            }
          }

          // Check collision with other characters
          const currentCharacters = gameRef?.current?.instance?.characters;
          if (currentCharacters) {
            for (const [charName, charData] of Object.entries(currentCharacters)) {
              if (charName === activeCharacterName) continue; // Skip self
              if (charData.location !== activeLocationName) continue; // Skip characters in other locations

              // Characters have a fixed collision radius
              const collisionRadius = 0.4;

              const distance = Math.sqrt(
                Math.pow(testPosition.x - charData.x, 2) +
                Math.pow(testPosition.y - charData.y, 2)
              );

              if (distance < collisionRadius) {
                return {
                  collides: true,
                  elementCenter: { x: charData.x, y: charData.y },
                  collisionRadius,
                  distance
                };
              }
            }
          }

          return { collides: false };
        };

        // Check if current position is inside a collision zone (bug recovery)
        const currentCollision = checkCollision(oldPosition);
        if (currentCollision.collides) {
          // Player is stuck inside an object! Push them out
          const dx = oldPosition.x - currentCollision.elementCenter.x;
          const dy = oldPosition.y - currentCollision.elementCenter.y;
          const angle = Math.atan2(dy, dx);

          // Push player to just outside the collision radius
          const safeDistance = currentCollision.collisionRadius + 0.05;
          finalPosition = {
            x: currentCollision.elementCenter.x + Math.cos(angle) * safeDistance,
            y: currentCollision.elementCenter.y + Math.sin(angle) * safeDistance
          };
        }
        // Normal movement with sliding collision
        else {
          const newCollision = checkCollision(finalPosition);
          if (newCollision.collides) {
            // Try moving only along X axis (slide horizontally)
            const xOnlyPosition = { x: newPosition.x, y: oldPosition.y };
            const xCollision = checkCollision(xOnlyPosition);
            if (!xCollision.collides) {
              finalPosition = xOnlyPosition;
            }
            // Try moving only along Y axis (slide vertically)
            else {
              const yOnlyPosition = { x: oldPosition.x, y: newPosition.y };
              const yCollision = checkCollision(yOnlyPosition);
              if (!yCollision.collides) {
                finalPosition = yOnlyPosition;
              }
              // Both axes blocked, don't move at all
              else {
                finalPosition = oldPosition;
              }
            }
          }
        }

        // Update position if it changed
        if (finalPosition.x !== oldPosition.x || finalPosition.y !== oldPosition.y) {
          // Check if we crossed an integer boundary (moved to a new cell)
          const crossedXBoundary = Math.floor(oldPosition.x) !== Math.floor(finalPosition.x);
          const crossedYBoundary = Math.floor(oldPosition.y) !== Math.floor(finalPosition.y);
          const crossedBoundary = crossedXBoundary || crossedYBoundary;

          playerPositionRef.current = finalPosition;
          setIsWalking(true);

          // Notify parent component of position change if callback provided
          // Pass timeProgression flag when crossing cell boundaries
          if (onPositionUpdate) {
            onPositionUpdate(finalPosition, { timeProgression: crossedBoundary });
          }
        } else {
          // Fully blocked, stop walking animation
          setIsWalking(false);
        }
      } else {
        setIsWalking(false);
      }

      // Update animal positions (always, regardless of player movement)
      if (gameRef?.current && playerPositionRef.current && stageSize) {
        const viewport = calculateViewportBounds(playerPositionRef.current, stageSize, cellSize);
        const { updates: animalUpdates, messages } = updateAnimalPositions(gameRef.current, viewport);

        if (animalUpdates.length > 0) {
          // Apply updates directly to gameRef (mutate in place for performance)
          animalUpdates.forEach(update => {
            const pathParts = update.path.split('.');
            // Skip 'instance' prefix since we're already at gameRef.current
            const relevantPath = pathParts.slice(1); // Remove 'instance'

            let target = gameRef.current.instance;
            for (let i = 0; i < relevantPath.length - 1; i++) {
              target = target[relevantPath[i]];
            }
            target[relevantPath[relevantPath.length - 1]] = update.value;
          });

          // Force re-render to show animal movement
          forceUpdate(prev => prev + 1);

          // Notify GamePage of state change (for game over checks)
          if (onGameUpdate) {
            onGameUpdate();
          }
        }

        // Send attack messages to GamePage
        if (messages.length > 0 && onMessage) {
          messages.forEach(message => onMessage(message));
        }
      }
    };

    const intervalId = setInterval(updatePlayerPosition, 16); // ~30fps

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!activeLocation || !activeLocation.elementInstances || !playerPositionRef.current) {
    return <div>Loading map...</div>;
  }

  // Get player position from ref
  const playerPosition = playerPositionRef.current;

  // Find the nearest object to the character
  const nearestObject = findNearestObject(game);
  const nearestInstanceId = nearestObject?.instanceId;

  // Get all element instances
  const elementInstances = Object.entries(activeLocation.elementInstances);

  // Get all characters in the current location
  const allCharacters = Object.entries(game.instance.characters || {})
    .filter(([, charData]) => charData.location === activeLocationName)
    .map(([charName, charData]) => ({
      type: 'character',
      id: charName,
      data: charData,
      y: charData.y,
      isActive: charName === activeCharacterName
    }));

  // Create an array that includes both objects and all characters for depth sorting
  const allEntities = [
    ...elementInstances.map(([id, instance]) => ({
      type: 'object',
      id,
      data: instance,
      y: instance.y
    })),
    ...allCharacters
  ];

  // Sort all entities by Y position for depth
  const sortedEntities = allEntities.sort((a, b) => b.y - a.y);

  const yScale = 0.75; // 45-degree camera angle

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        style={{
          background: 'linear-gradient(to top left, #b4c599ff, #c1caa5ff)'
        }}
      >
      <Layer
        x={stageSize.width / 2}
        y={stageSize.height / 2}
        scaleY={yScale}
        offsetX={playerPosition.x * cellSize}
        offsetY={playerPosition.y * cellSize}
      >
        {/* Render shadows for all entities (objects and character) */}
        {[...sortedEntities].reverse().map((entity) => {
          if (entity.type === 'object') {
            const isNearest = entity.id === nearestInstanceId;
            return (
              <ObjectShadow
                key={`shadow-${entity.id}`}
                instance={entity.data}
                instanceId={entity.id}
                isNearest={isNearest}
              />
            );
          } else {
            return (
              <CharacterShadow
                key={`shadow-${entity.id}`}
                charData={entity.data}
                entityId={entity.id}
              />
            );
          }
        })}

        {/* Render all entities (objects and character) in depth-sorted order */}
        {[...sortedEntities].reverse().map((entity) => {
          if (entity.type === 'object') {
            const instance = entity.data;
            const instanceId = entity.id;
            const displayText = instance.element + (instance.level ? ` L${instance.level}` : '');

            // Full opacity only for the nearest object, reduced for all others
            const isNearest = instanceId === nearestInstanceId;
            const opacity = isNearest ? 1 : 0.4;

            // Get color from element definition
            const elementDef = gameElements?.[instance.collection]?.[instance.element];

            // Check if character is behind this object
            const spriteId = elementDef?.spriteId;
            const spriteConfig = sprites[spriteId] || {};
            const spriteWidth = spriteConfig.width || 1;
            const spriteHeight = spriteConfig.height || spriteConfig.width || 1;
            const yOffset = spriteConfig.yOffset || 0;

            // Character is behind if:
            // 1. Object's Y is greater than character's Y (object is in front)
            // 2. Character is within the horizontal bounds of the sprite
            // 3. Character is within the vertical bounds of the sprite
            var instanceCenterY = instance.y + spriteWidth / 2;

            const objectBottomY = instanceCenterY + yOffset;
            const objectTopY = instanceCenterY - spriteHeight + yOffset;
            const objectLeftX = instance.x;
            const objectRightX = instance.x + spriteWidth;
            const characterIsBehind =
              instanceCenterY > playerPosition.y &&
              playerPosition.x >= objectLeftX &&
              playerPosition.x <= objectRightX &&
              playerPosition.y >= objectTopY &&
              playerPosition.y <= objectBottomY;

            return (
              <MapSimpleObject
                key={instanceId}
                instance={instance}
                instanceId={instanceId}
                elementDef={elementDef}
                x={instance.x * cellSize}
                y={instance.y * cellSize}
                opacity={opacity}
                displayText={displayText}
                characterIsBehind={characterIsBehind}
              />
            );
          } else {
            // Character
            const charData = entity.data;
            const charName = entity.id;
            const isActiveChar = entity.isActive;
            return (
              <MapSimpleCharacter
                key={entity.id}
                characterName={charName}
                character={game.elements.Characters[charName]}
                x={charData.x * cellSize}
                y={charData.y * cellSize}
                isWalking={isActiveChar && isWalking}
                isActive={isActiveChar}
              />
            );
          }
        })}
      </Layer>
      </Stage>
      <Joystick
        containerRef={containerRef}
        onMove={(direction) => {
          joystickDirection.current = direction;
        }}
      />
    </div>
  );
}
