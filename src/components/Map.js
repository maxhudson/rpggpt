import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

const Stage = dynamic(() => import('react-konva').then(mod => ({ default: mod.Stage })), { ssr: false });
const Layer = dynamic(() => import('react-konva').then(mod => ({ default: mod.Layer })), { ssr: false });
const Ellipse = dynamic(() => import('react-konva').then(mod => ({ default: mod.Ellipse })), { ssr: false });

import MapObject from './MapObject';
import Player from './Player';

export default function Map({
  game,
  objectTypes,
  isEditing,
  updateGame,
  stateRef,
  onDragStart,
  onDragMove,
  onDragEnd,
  stageSize,
  setStageSize,
  zoom,
  setZoom,
  offset,
  setOffset,
  playerPosition,
  setPlayerPosition
}) {
  const [dragCreateObject, setDragCreateObject] = useState(null);
  const keysPressed = useRef({});

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

  // Check for collisions with objects - allows walking away from inside boundary
  const checkCollision = (newX, newY, currentPlayerPos) => {
    const currentState = stateRef.current;
    if (!currentState?.game?.data?.mapObjects || !currentState?.objectTypes) {
      console.log('No collision data available');
      return false;
    }

    const playerRadius = 10; // Player collision radius
    const currentMapObjects = Object.values(currentState.game.data.mapObjects);
    const currentObjectTypes = currentState.objectTypes;

    console.log('Checking collision:', {
      newX, newY,
      currentPlayerPos,
      mapObjectsCount: currentMapObjects.length,
      objectTypesCount: Object.keys(currentObjectTypes).length
    });

    const hasCollision = currentMapObjects.some(obj => {
      const objType = currentObjectTypes[obj.objectTypeId];
      if (!objType || objType.type === 'material') return false; // No collision with materials

      const collisionRadius = objType.collisionRadius || 0.25;
      const objDisplayWidth = objType.type === 'material' ? 20 : (objType.originalWidth || 100) * (objType.scale || 1);
      const boundaryDistance = playerRadius + (objDisplayWidth * collisionRadius);

      const currentDistance = Math.sqrt(
        Math.pow(obj.x - currentPlayerPos.x, 2) +
        Math.pow(obj.y - currentPlayerPos.y, 2)
      );

      const newDistance = Math.sqrt(
        Math.pow(obj.x - newX, 2) +
        Math.pow(obj.y - newY, 2)
      );

      console.log('Object collision check:', {
        objId: obj.objectTypeId,
        objPos: { x: obj.x, y: obj.y },
        objType: objType.title,
        collisionRadius,
        objDisplayWidth,
        boundaryDistance,
        currentDistance,
        newDistance,
        wouldCollide: newDistance < boundaryDistance
      });

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

  useEffect(() => {
    const moveSpeed = 1;

    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;
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
          if (deltaX !== 0 && !checkCollision(newX, prev.y, prev)) {
            finalX = newX;
          }

          // Check Y movement
          if (deltaY !== 0 && !checkCollision(finalX, newY, prev)) {
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
  }, []);

  const { mapObjects = {} } = game.data;

  const handleUpdatePosition = async (uuid, newPosition) => {
    if (!updateGame) return;

    const gameData = game.data;
    const updatedGameData = {
      ...gameData,
      mapObjects: {
        ...gameData.mapObjects,
        [uuid]: {
          ...gameData.mapObjects[uuid],
          x: newPosition.x,
          y: newPosition.y
        }
      }
    };

    await updateGame({ data: updatedGameData });
  };

  const handleWheel = (e) => {
    // e.evt.preventDefault();

    // const stage = e.target.getStage();
    // const oldScale = stage.scaleX();
    // const pointer = stage.getPointerPosition();

    // // Determine zoom direction and amount
    // const direction = e.evt.deltaY < 0 ? -1 : 1;
    // const zoomFactor = 1.1;
    // let newScale = direction > 0 ? oldScale * zoomFactor : oldScale / zoomFactor;

    // // Clamp zoom between 0.5x and 2x
    // newScale = Math.max(0.5, Math.min(2, newScale));

    // setZoom(newScale);

    // // Update offset to keep zoom centered
    // const newPos = {
    //   x: -stageSize.width * (newScale - 1) / 2,
    //   y: -stageSize.height * (newScale - 1) / 2,
    // };

    // setOffset(newPos);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#cdceac' }}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={offset.x}
        y={offset.y}
        onWheel={handleWheel}
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

          {/* Render objects and player sorted by Y position for depth */}
          {[
            // Add player to the rendering list with current Y position
            {
              id: 'player',
              y: playerPosition.y,
              isPlayer: true
            },
            // Add all map objects (excluding materials)
            ...Object.entries(mapObjects)
              .filter(([uuid, mapObject]) => {
                const objectType = objectTypes[mapObject.objectTypeId];
                return objectType && objectType.type !== 'material';
              })
              .map(([uuid, mapObject]) => ({
                id: uuid,
                y: mapObject.y,
                isPlayer: false,
                mapObject,
                objectType: objectTypes[mapObject.objectTypeId]
              }))
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
                    uuid={item.id}
                    mapObject={item.mapObject}
                    objectType={item.objectType}
                    playerPosition={playerPosition}
                    stageSize={stageSize}
                    zoom={zoom}
                    offset={offset}
                    isEditing={isEditing}
                    onUpdatePosition={handleUpdatePosition}
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
