import React, { useEffect, useState, useRef } from 'react';
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
  const joystickDirection = useRef({ x: 0, y: 0, speed: 0 });

  // Extract data from game
  const activeCharacterName = game?.instance?.activeCharacter;
  const activeLocationName = game?.instance?.activeLocation;
  const characterData = game?.instance?.characters?.[activeCharacterName];
  const activeLocation = game?.instance?.locations?.[activeLocationName];
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
        const joystickSpeed = baseMoveSpeed * joystickDirection.current.speed;
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

        // Check if we crossed an integer boundary (moved to a new cell)
        const crossedXBoundary = Math.floor(oldPosition.x) !== Math.floor(newPosition.x);
        const crossedYBoundary = Math.floor(oldPosition.y) !== Math.floor(newPosition.y);
        const crossedBoundary = crossedXBoundary || crossedYBoundary;

        playerPositionRef.current = newPosition;
        setIsWalking(true);

        // Notify parent component of position change if callback provided
        // Pass timeProgression flag when crossing cell boundaries
        if (onPositionUpdate) {
          onPositionUpdate(newPosition, { timeProgression: crossedBoundary });
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
    <>
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
            const instance = entity.data;
            const instanceId = entity.id;
            const spriteConfig = sprites[instance.element] || {};
            const width = cellSize * (spriteConfig.width || 1);
            const shadowScale = spriteConfig.shadowScale || 1;
            var height = width;
            const isAnimal = instance.collection === 'Animals';

            // Full opacity only for the nearest object, reduced for all others
            const isNearest = instanceId === nearestInstanceId;
            const opacity = isNearest ? 0.5 : 0.25;

            return (<>
              {!isAnimal && (
                <Rect
                  key={`shadow-${instanceId}`}
                  x={instance.x * cellSize + 1}
                  y={instance.y * cellSize + 1}
                  width={width - 2}
                  height={height - 2}
                  fill={`rgba(0, 0, 0, ${opacity * 0.2})`}
                />
              )}
              {sprites[instance.element] && spriteConfig.shadowScale !== 0 && (<Ellipse
                x={instance.x * cellSize + width / 2}
                y={instance.y * cellSize + height / 2}
                radiusX={width / 2 * shadowScale}
                radiusY={height / 2 * shadowScale}
                fill={`rgba(0, 0, 0, 0.1)`}
                opacity={(spriteConfig.shadowOpacity || 1)}
              />)}
            </>);
          } else {
            // Character shadow
            const charData = entity.data;
            return (
              <Ellipse
                key={`shadow-${entity.id}`}
                x={charData.x * cellSize}
                y={charData.y * cellSize + 1}
                radiusX={cellSize / 6}
                radiusY={cellSize / 6}
                fill="rgba(0, 0, 0, 0.1)"
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
        onMove={(direction) => {
          joystickDirection.current = direction;
        }}
      />
    </>
  );
}
