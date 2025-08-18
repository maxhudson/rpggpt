import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

const Stage = dynamic(() => import('react-konva').then(mod => ({ default: mod.Stage })), { ssr: false });
const Layer = dynamic(() => import('react-konva').then(mod => ({ default: mod.Layer })), { ssr: false });
const Ellipse = dynamic(() => import('react-konva').then(mod => ({ default: mod.Ellipse })), { ssr: false });

import MapObject from './MapObject';
import Player from './Player';

export default function Map({
  game,
  elementTypes,
  isEditing,
  updateGame,
  stateRef,
  onDragStart,
  onDragMove,
  onDragEnd,
  stageSize,
  setStageSize,
  playerPosition,
  setPlayerPosition
}) {
  const keysPressed = useRef({});
  const [selectedElementId, setSelectedElementId] = useState(null);

  useEffect(() => {
    const updateSize = () => {
      setStageSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Set initial size
    updateSize();

    // Add resize listener
    window.addEventListener('resize', updateSize);

    // Cleanup
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Check for collisions with elements - allows walking away from inside boundary
  const checkCollision = (newX, newY, currentPlayerPos) => {
    const currentState = stateRef.current;
    const mapElements = currentState?.game?.map?.elements || {};
    if (!mapElements || !currentState?.elementTypes) {
      console.log('No collision data available');
      return false;
    }

    const playerRadius = 10; // Player collision radius
    const currentMapElements = Object.entries(mapElements);
    const currentElementTypes = currentState.elementTypes;

    const hasCollision = currentMapElements.some(([elementId, mapElement]) => {
      const [elementTypeId, x, y] = mapElement; // [elementTypeId, x, y]
      const elementType = currentElementTypes[elementTypeId];
      if (!elementType) return false;

      const collisionRadius = elementType.data.collisionRadius || 0.25;
      const elementDisplayWidth = (elementType.data.width || 1) * 20; // K.gridSize
      const boundaryDistance = playerRadius + (elementDisplayWidth * collisionRadius);

      const currentDistance = Math.sqrt(
        Math.pow(x - currentPlayerPos.x, 2) +
        Math.pow(y - currentPlayerPos.y, 2)
      );

      const newDistance = Math.sqrt(
        Math.pow(x - newX, 2) +
        Math.pow(y - newY, 2)
      );

      // If currently inside boundary, allow movement that increases distance (walking away)
      if (currentDistance < boundaryDistance) {
        const blocked = newDistance < currentDistance;
        console.log('Inside boundary - blocked:', blocked);
        return blocked; // Block only if getting closer
      }

      // If currently outside boundary, prevent entering
      const blocked = newDistance < boundaryDistance;
      console.log('Outside boundary - blocked:', blocked);
      return blocked;
    });

    console.log('Final collision result:', hasCollision);
    return hasCollision;
  };

  // Check if player is within boundary polygon
  const checkBoundaryCollision = (newX, newY) => {
    const boundaryPolygon = game?.map?.boundaryPolygon;
    if (!boundaryPolygon || boundaryPolygon.length < 3) return false;

    // Point-in-polygon test using ray casting algorithm
    let inside = false;
    for (let i = 0, j = boundaryPolygon.length - 1; i < boundaryPolygon.length; j = i++) {
      const xi = boundaryPolygon[i][0], yi = boundaryPolygon[i][1];
      const xj = boundaryPolygon[j][0], yj = boundaryPolygon[j][1];

      if (((yi > newY) !== (yj > newY)) && (newX < (xj - xi) * (newY - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return !inside; // Return true if outside boundary (collision)
  };

  useEffect(() => {
    const moveSpeed = 1;

    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;

      // Handle delete/backspace for selected elements
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId && isEditing) {
        e.preventDefault();

        // Use stateRef to access current game state and updateGame function
        const currentGame = stateRef.current.game;
        if (!updateGame || !selectedElementId || !currentGame?.map?.elements) return;

        const updatedElements = { ...currentGame.map.elements };
        delete updatedElements[selectedElementId];

        const updatedMap = {
          elements: updatedElements,
          boundaryPolygon: currentGame.map.boundaryPolygon || null
        };

        updateGame({ ...currentGame, map: updatedMap });
        setSelectedElementId(null);
      }
    };

    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    const updatePlayerPosition = () => {
      let deltaX = 0;
      let deltaY = 0;

      if (keysPressed.current['w']) deltaY -= moveSpeed;
      if (keysPressed.current['s']) deltaY += moveSpeed;
      if (keysPressed.current['a']) deltaX -= moveSpeed;
      if (keysPressed.current['d']) deltaX += moveSpeed;

      if (deltaX !== 0 || deltaY !== 0) {
        setPlayerPosition(prev => {
          const newX = prev.x + deltaX;
          const newY = prev.y + deltaY;

          // Check collision for each axis separately to allow sliding along walls
          let finalX = prev.x;
          let finalY = prev.y;

          // Check X movement
          if (deltaX !== 0 && !checkCollision(newX, prev.y, prev) && !checkBoundaryCollision(newX, prev.y)) {
            finalX = newX;
          }

          // Check Y movement
          if (deltaY !== 0 && !checkCollision(finalX, newY, prev) && !checkBoundaryCollision(finalX, newY)) {
            finalY = newY;
          }

          return { x: finalX, y: finalY };
        });
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
  }, [selectedElementId, isEditing]);

  const mapElements = game.map.elements;

  const handleDeleteElement = async (elementId) => {
    if (!updateGame || !elementId) return;

    const updatedElements = { ...mapElements };
    delete updatedElements[elementId];

    const updatedMap = {
      elements: updatedElements,
      boundaryPolygon: game.map.boundaryPolygon || null
    };

    await updateGame({ ...game, map: updatedMap });
    setSelectedElementId(null);
  };

  const handleUpdatePosition = async (elementId, newPosition) => {
    if (!updateGame) return;

    const existingElement = mapElements[elementId];
    if (existingElement) {
      const updatedElements = {
        ...mapElements,
        [elementId]: [existingElement[0], newPosition.x, newPosition.y] // [elementTypeId, x, y]
      };

      const updatedMap = {
        elements: updatedElements,
        boundaryPolygon: game.map.boundaryPolygon || null
      };

      await updateGame({ ...game, map: updatedMap });
    }
  };

  const handleElementSelect = (elementId) => {
    setSelectedElementId(elementId);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#cdceac' }}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
      >
        <Layer>
          {/* Render Player Shadow - below all other elements */}
          <Ellipse
            x={stageSize.width / 2}
            y={stageSize.height / 2 + 1}
            radiusX={6}
            radiusY={3}
            fill="rgba(0, 0, 0, 0.3)"
            opacity={0.6}
            listening={false}
          />

          {/* Render elements and player sorted by Y position for depth */}
          {[
            // Add player to the rendering list with current Y position
            {
              id: 'player',
              y: playerPosition.y,
              isPlayer: true
            },
            // Add all map elements (excluding materials)
            ...Object.entries(mapElements)
              .filter(([elementId, mapElement]) => {
                const [elementTypeId] = mapElement; // [elementTypeId, x, y]
                const elementType = elementTypes[elementTypeId];
                return elementType;
              })
              .map(([elementId, mapElement]) => {
                const [elementTypeId, x, y] = mapElement; // [elementTypeId, x, y]
                return {
                  id: elementId,
                  y: y,
                  isPlayer: false,
                  elementId,
                  elementTypeId,
                  x,
                  elementType: elementTypes[elementTypeId]
                };
              })
          ]
            .sort((a, b) => a.y - b.y) // Sort by Y position (lower Y renders first/behind)
            .map(item => {
              if (item.isPlayer) {
                return (
                  <Player
                    key="player"
                    centerX={stageSize.width / 2}
                    centerY={stageSize.height / 2}
                    playerPosition={playerPosition}
                    fill="#ff0000"
                  />
                );
              } else {
                return (
                  <MapObject
                    key={item.id}
                    elementId={item.elementId}
                    elementTypeId={item.elementTypeId}
                    x={item.x}
                    y={item.y}
                    elementType={item.elementType}
                    playerPosition={playerPosition}
                    stageSize={stageSize}
                    isEditing={isEditing}
                    isSelected={selectedElementId === item.elementId}
                    onUpdatePosition={handleUpdatePosition}
                    onSelect={handleElementSelect}
                    onDragStart={onDragStart}
                    onDragMove={onDragMove}
                    onDragEnd={onDragEnd}
                  />
                );
              }
            })}
        </Layer>
      </Stage>
    </div>
  );
}
