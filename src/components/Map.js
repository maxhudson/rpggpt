import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

const Stage = dynamic(() => import('react-konva').then(mod => ({ default: mod.Stage })), { ssr: false });
const Layer = dynamic(() => import('react-konva').then(mod => ({ default: mod.Layer })), { ssr: false });
const Ellipse = dynamic(() => import('react-konva').then(mod => ({ default: mod.Ellipse })), { ssr: false });
const Line = dynamic(() => import('react-konva').then(mod => ({ default: mod.Line })), { ssr: false });
const Circle = dynamic(() => import('react-konva').then(mod => ({ default: mod.Circle })), { ssr: false });
const Rect = dynamic(() => import('react-konva').then(mod => ({ default: mod.Rect })), { ssr: false });
const Path = dynamic(() => import('react-konva').then(mod => ({ default: mod.Path })), { ssr: false });

import MapObject from './MapObject';
import Player from './Player';
import EditablePath from './EditablePath';

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
  player,
  selectedPolygonId,
  setSelectedPolygonId,
  onDeselectAll,
  session,
  setNearbyInteractiveElementIds,
  advanceTime
}) {
  const keysPressed = useRef({});
  const [selectedElementId, setSelectedElementId] = useState(null);

  // Time system state
  const movementDistanceRef = useRef(0);

  useEffect(() => {
    const updateSize = () => {
      const maxWidth = 800;
      const maxHeight = 600;

      setStageSize({
        width: Math.min(window.innerWidth, maxWidth),
        height: Math.min(window.innerHeight, maxHeight)
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
    const moveSpeed = 2;

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
      // Don't move player if user is typing in an input field or if a modal is open
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );

      // Check if any modal dialogs are open (ElementTypeEditor has z-index 1000)
      const hasModalOpen = document.querySelector('[style*="z-index: 1000"]') !== null;

      if (isInputFocused || hasModalOpen) return;

      let deltaX = 0;
      let deltaY = 0;

      if (keysPressed.current['w']) deltaY -= moveSpeed;
      if (keysPressed.current['s']) deltaY += moveSpeed;
      if (keysPressed.current['a']) deltaX -= moveSpeed;
      if (keysPressed.current['d']) deltaX += moveSpeed;

      if (deltaX !== 0 || deltaY !== 0) {
        const currentPlayer = stateRef.current.player;
        if (!currentPlayer || !currentPlayer.position) {
          console.log('No player data available for movement', currentPlayer);
          return;
        }

        const currentPlayerPos = currentPlayer.position;
        const newX = currentPlayerPos.x + deltaX;
        const newY = currentPlayerPos.y + deltaY;

        // Check collision for each axis separately to allow sliding along walls
        let finalX = currentPlayerPos.x;
        let finalY = currentPlayerPos.y;

        // Check X movement
        // if (deltaX !== 0 && !checkCollision(newX, currentPlayerPos.y, currentPlayerPos) && !checkBoundaryCollision(newX, currentPlayerPos.y)) {
          finalX = newX;
        // }

        // Check Y movement
        // if (deltaY !== 0 && !checkCollision(finalX, newY, currentPlayerPos) && !checkBoundaryCollision(finalX, newY)) {
          finalY = newY;
        // }

        // Update player position in game state
        if (finalX !== currentPlayerPos.x || finalY !== currentPlayerPos.y) {
          var currentGame = stateRef.current.game;
          if (!currentGame || !session?.user?.id) {
            console.log('Missing game or session data', { currentGame: !!currentGame, sessionUserId: session?.user?.id });
            return;
          }

          // Calculate movement distance for time progression
          const movementDistance = Math.sqrt(
            Math.pow(finalX - currentPlayerPos.x, 2) +
            Math.pow(finalY - currentPlayerPos.y, 2)
          );

          // Accumulate movement distance
          movementDistanceRef.current += movementDistance;

          // Check if we've moved enough to advance time (100px = 5 minutes)
          const distanceThreshold = 100;
          const minutesPerThreshold = 5;
          console.log(movementDistanceRef.current)
          if (movementDistanceRef.current >= distanceThreshold) {
            movementDistanceRef.current = movementDistanceRef.current - distanceThreshold; // Keep remainder

            advanceTime(minutesPerThreshold);
          }
          var currentGame = stateRef.current.game;

          const updatedPlayers = {
            ...currentGame.players,
            [session.user.id]: {
              ...currentPlayer,
              position: { x: finalX, y: finalY }
            }
          };
          const updatedGame = { ...currentGame, players: updatedPlayers };
          updateGame(updatedGame, { updateSupabase: true, updateState: true });

          // Update nearby interactive elements after player movement
          updateNearbyInteractiveElements();
        }
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
  }, [selectedElementId, isEditing, updateGame, session.user.id]);
  console.log(session.user.id, 'session user ID in Map component');
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
    setSelectedPolygonId(null); // Clear polygon selection when selecting an element
  };

  const handlePolygonSelect = (polygonId) => {
    setSelectedPolygonId(polygonId);
    setSelectedElementId(null); // Clear element selection when selecting a polygon
  };

  // Handle boundary point dragging
  const handleBoundaryPointDrag = (pointIndex, newPosition) => {
    if (!isEditing || !updateGame) return;

    const boundaryPolygon = game?.map?.boundaryPolygon || [];
    const updatedPolygon = [...boundaryPolygon];
    updatedPolygon[pointIndex] = [newPosition.x, newPosition.y];

    const updatedMap = {
      elements: game.map.elements,
      boundaryPolygon: updatedPolygon
    };

    updateGame({ ...game, map: updatedMap });
  };

  // Handle background polygon point dragging
  const handleBackgroundPolygonPointDrag = (polygonId, pointIndex, newPosition, isShiftPressed) => {
    if (!isEditing || !updateGame) return;

    const currentPolygon = game?.background?.[polygonId];
    if (!currentPolygon) return;

    const updatedPoints = [...currentPolygon.points];

    // Apply grid snapping if shift is pressed
    const finalPosition = isShiftPressed ?
      [snapToGrid(newPosition.x), snapToGrid(newPosition.y)] :
      [newPosition.x, newPosition.y];

    updatedPoints[pointIndex] = finalPosition;

    const updatedBackground = {
      ...game.background,
      [polygonId]: {
        ...currentPolygon,
        points: updatedPoints
      }
    };

    updateGame({ ...game, background: updatedBackground });
  };

  // Handle background polygon dragging (entire polygon)
  const handleBackgroundPolygonDrag = (polygonId, newPoints) => {
    if (!isEditing || !updateGame) return;

    const currentPolygon = game?.background?.[polygonId];
    if (!currentPolygon) return;

    const updatedBackground = {
      ...game.background,
      [polygonId]: {
        ...currentPolygon,
        points: newPoints
      }
    };

    updateGame({ ...game, background: updatedBackground });
  };

  // Grid snap function
  const snapToGrid = (value) => {
    const gridSize = 20; // K.gridSize
    return Math.round(value / gridSize) * gridSize;
  };

  // Convert world coordinates to screen coordinates
  const worldToScreen = (worldX, worldY) => {
    return {
      x: stageSize.width / 2 + (worldX - player.position.x),
      y: stageSize.height / 2 + (worldY - player.position.y)
    };
  };

  // Convert screen coordinates to world coordinates
  const screenToWorld = (screenX, screenY) => {
    return {
      x: player.position.x + (screenX - stageSize.width / 2),
      y: player.position.y + (screenY - stageSize.height / 2)
    };
  };

  // Function to detect nearby interactive elements and update only if changed
  const updateNearbyInteractiveElements = () => {
    if (!stateRef.current.game || !stateRef.current.elementTypes || isEditing || !stateRef.current.player || !setNearbyInteractiveElementIds) {
      const currentNearbyIds = stateRef.current.nearbyInteractiveElementIds || [];
      if (currentNearbyIds.length > 0) {
        setNearbyInteractiveElementIds([]);
      }
      return;
    }

    const interactionDistance = 60; // Distance in pixels for interaction
    const mapElements = stateRef.current.game.map?.elements || {};
    const nearby = [];

    Object.entries(mapElements).forEach(([elementId, mapElement]) => {
      const [elementTypeId, x, y] = mapElement;
      const elementType = stateRef.current.elementTypes[elementTypeId];

      if (!elementType) return;

      // Check if any actions are enabled
      const hasActions = elementType.data.actions?.craft === 1 ||
                        elementType.data.actions?.sell === 1 ||
                        elementType.data.actions?.buy === 1;

      // Check if element has tool data and player has compatible tools
      const hasToolData = elementType.data.toolData && Object.keys(elementType.data.toolData).length > 0;
      let hasCompatibleTool = false;

      if (hasToolData && stateRef.current.player?.inventory) {
        // Check if player has any tools that can be used on this element
        Object.keys(elementType.data.toolData).forEach(toolElementTypeId => {
          if (stateRef.current.player.inventory[toolElementTypeId] > 0) {
            hasCompatibleTool = true;
          }
        });
      }

      if (!hasActions && !hasCompatibleTool) return;

      // Calculate distance from player
      const distance = Math.sqrt(
        Math.pow(x - stateRef.current.player.position.x, 2) +
        Math.pow(y - stateRef.current.player.position.y, 2)
      );

      if (distance <= interactionDistance) {
        nearby.push({
          elementId,
          elementTypeId,
          distance,
          x,
          y,
          hasToolData: hasCompatibleTool
        });
      }
    });

    // Sort by distance (closest first)
    nearby.sort((a, b) => a.distance - b.distance);

    // Compare with current nearby elements to avoid unnecessary updates
    const currentNearbyIds = stateRef.current.nearbyInteractiveElementIds || [];
    const hasChanged = nearby.length !== currentNearbyIds.length ||
      nearby.some((newItem, index) => {
        const currentItem = currentNearbyIds[index];
        return !currentItem ||
               newItem.elementId !== currentItem.elementId ||
               newItem.elementTypeId !== currentItem.elementTypeId;
      });

    if (hasChanged) {
      setNearbyInteractiveElementIds(nearby);
    }
  };

  return (
    <Stage
      width={stageSize.width}
      height={stageSize.height}
      onClick={(e) => {
        // Only deselect if clicking on the stage itself (empty space)
        if (e.target === e.target.getStage()) {
          if (onDeselectAll) {
            onDeselectAll();
          }
        }
      }}
    >
        <Layer>
          {/* Render checkerboard grid when in edit mode */}
          {/* {isEditing && (() => {
            const gridSize = 20;
            const gridElements = [];

            // Calculate visible grid bounds based on player position and screen size
            const leftBound = Math.floor((player.position.x - stageSize.width / 2) / gridSize) - 1;
            const rightBound = Math.ceil((player.position.x + stageSize.width / 2) / gridSize) + 1;
            const topBound = Math.floor((player.position.y - stageSize.height / 2) / gridSize) - 1;
            const bottomBound = Math.ceil((player.position.y + stageSize.height / 2) / gridSize) + 1;

            for (let gridX = leftBound; gridX <= rightBound; gridX++) {
              for (let gridY = topBound; gridY <= bottomBound; gridY++) {
                // Checkerboard pattern: only render tiles where (x + y) is even
                if ((gridX + gridY) % 2 === 0) {
                  const worldX = gridX * gridSize;
                  const worldY = gridY * gridSize;
                  const screenPos = worldToScreen(worldX, worldY);

                  gridElements.push(
                    <Rect
                      key={`grid-${gridX}-${gridY}`}
                      x={screenPos.x}
                      y={screenPos.y}
                      width={gridSize}
                      height={gridSize}
                      fill="rgba(0, 0, 0, 0.1)"
                      listening={false}
                    />
                  );
                }
              }
            }

            return gridElements;
          })()} */}

          {/* Render red dot at world coordinates (0,0) when in edit mode */}
          {isEditing && (() => {
            const originScreenPos = worldToScreen(0, 0);
            return (
              <Circle
                x={originScreenPos.x}
                y={originScreenPos.y}
                radius={1}
                fill="red"
                listening={false}
              />
            );
          })()}

          {/* Render background polygons using EditablePath component */}
          {game?.background && Object.entries(game.background).map(([polygonId, polygon]) => (
            <EditablePath
              key={`editable-path-${polygonId}`}
              polygonId={polygonId}
              polygon={polygon}
              isEditing={isEditing}
              isSelected={selectedPolygonId === polygonId}
              worldToScreen={worldToScreen}
              screenToWorld={screenToWorld}
              onPointDrag={handleBackgroundPolygonPointDrag}
              onPolygonSelect={handlePolygonSelect}
              onPolygonDrag={handleBackgroundPolygonDrag}
            />
          ))}

          {/* Render Player Shadow - below all other elements */}
          <Ellipse
            x={stageSize.width / 2}
            y={stageSize.height / 2 + 1}
            radiusX={8}
            radiusY={4}
            fill="rgba(0, 0, 0, 0.2)"
            opacity={0.6}
            listening={false}
          />

          {/* Render elements and player sorted by Y position for depth */}
          {[
            // Add player to the rendering list with current Y position
            {
              id: 'player',
              y: player.position.y,
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
                    playerPosition={player.position}
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
                    playerPosition={player.position}
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

          {/* Render boundary polygon if in editing mode */}
          {isEditing && game?.map?.boundaryPolygon && game.map.boundaryPolygon.length >= 3 && (
            <>
              {/* Boundary polygon outline */}
              <Line
                points={game.map.boundaryPolygon.flatMap(([worldX, worldY]) => {
                  const screenPos = worldToScreen(worldX, worldY);
                  return [screenPos.x, screenPos.y];
                })}
                closed={true}
                stroke="#ff6b6b"
                strokeWidth={2}
                dash={[10, 5]}
                listening={false}
              />

              {/* Draggable boundary points */}
              {game.map.boundaryPolygon.map(([worldX, worldY], pointIndex) => {
                const screenPos = worldToScreen(worldX, worldY);
                return (
                  <Circle
                    key={`boundary-point-${pointIndex}`}
                    x={screenPos.x}
                    y={screenPos.y}
                    radius={8}
                    fill="#ff6b6b"
                    stroke="#ffffff"
                    strokeWidth={2}
                    draggable={true}
                    onDragMove={(e) => {
                      const worldPos = screenToWorld(e.target.x(), e.target.y());
                      handleBoundaryPointDrag(pointIndex, worldPos);
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
          )}
        </Layer>
    </Stage>
  );
}
