import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Stage = dynamic(() => import('react-konva').then(mod => ({ default: mod.Stage })), { ssr: false });
const Layer = dynamic(() => import('react-konva').then(mod => ({ default: mod.Layer })), { ssr: false });

import MapObject from './MapObject';

export default function Map({ game, objectTypes, isEditing, updateGame, debouncedUpdateGame, drawingMode, selectedMaterialId, stateRef }) {
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isRightClickDrawing, setIsRightClickDrawing] = useState(false);

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

  const { playerPosition = { x: 0, y: 0 }, mapObjects = {} } = game.data;

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

  const GRID_SIZE = 20;
  const snapToGrid = (value) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  const addOrRemoveMaterialAtPosition = (worldX, worldY, isErasing = false) => {
    if (!drawingMode || (!selectedMaterialId && !isErasing) || !debouncedUpdateGame) return;

    const snappedX = snapToGrid(worldX);
    const snappedY = snapToGrid(worldY);

    // Use stateRef to get current data to avoid race conditions
    const currentGame = stateRef.current.game;
    const currentObjectTypes = stateRef.current.objectTypes;
    const currentMapObjects = currentGame.data.mapObjects || {};

    // Find existing material at this position
    const existingMaterialEntry = Object.entries(currentMapObjects).find(([uuid, obj]) => {
      const objType = currentObjectTypes[obj.objectTypeId];
      return objType && objType.type === 'material' &&
             snapToGrid(obj.x) === snappedX &&
             snapToGrid(obj.y) === snappedY;
    });

    if (existingMaterialEntry) {
      // If erasing or drawing on top of existing material, remove it
      if (isErasing || selectedMaterialId) {
        const [existingUuid] = existingMaterialEntry;
        const updatedMapObjects = { ...currentMapObjects };
        delete updatedMapObjects[existingUuid];

        const updatedGameData = {
          ...currentGame.data,
          mapObjects: updatedMapObjects
        };

        debouncedUpdateGame({ data: updatedGameData });
      }
      return;
    }

    // If not erasing and no existing material, place new material
    if (!isErasing && selectedMaterialId) {
      const mapObjectId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newMapObject = {
        x: snappedX,
        y: snappedY,
        objectTypeId: selectedMaterialId
      };

      const updatedGameData = {
        ...currentGame.data,
        mapObjects: {
          ...currentMapObjects,
          [mapObjectId]: newMapObject
        }
      };

      debouncedUpdateGame({ data: updatedGameData });
    }
  };

  const handleStageMouseDown = (e) => {
    if (!drawingMode) return;

    const isRightClick = e.evt.button === 2;
    if (!selectedMaterialId && !isRightClick) return;

    setIsDrawing(true);

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();

    // Convert screen coordinates to world coordinates with offset
    const screenCenterX = stageSize.width / 2;
    const screenCenterY = stageSize.height / 2;
    const worldX = pointerPosition.x - screenCenterX + playerPosition.x;
    const worldY = pointerPosition.y - screenCenterY + playerPosition.y + (GRID_SIZE / 2);

    addOrRemoveMaterialAtPosition(worldX, worldY, isRightClick);
  };

  const handleStageMouseMove = (e) => {
    if (!isDrawing || !drawingMode) return;

    const isRightClick = e.evt.button === 2;
    if (!selectedMaterialId && !isRightClick) return;

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();

    // Convert screen coordinates to world coordinates with offset
    const screenCenterX = stageSize.width / 2;
    const screenCenterY = stageSize.height / 2;
    const worldX = pointerPosition.x - screenCenterX + playerPosition.x;
    const worldY = pointerPosition.y - screenCenterY + playerPosition.y + (GRID_SIZE / 2);

    addOrRemoveMaterialAtPosition(worldX, worldY, isRightClick);
  };

  const handleStageMouseUp = () => {
    setIsDrawing(false);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'hsl(73, 20%, 78%)' }}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
      >
        <Layer>
          {/* Render map objects - materials first, then objects */}
          {Object.entries(mapObjects)
            .sort(([, mapObjectA], [, mapObjectB]) => {
              const objectTypeA = objectTypes[mapObjectA.objectTypeId];
              const objectTypeB = objectTypes[mapObjectB.objectTypeId];

              const isMaterialA = (objectTypeA?.type || 'object') === 'material';
              const isMaterialB = (objectTypeB?.type || 'object') === 'material';

              // Materials first (return -1), then objects (return 1)
              if (isMaterialA && !isMaterialB) return -1;
              if (!isMaterialA && isMaterialB) return 1;
              return 0;
            })
            .map(([uuid, mapObject]) => {
              const objectType = objectTypes[mapObject.objectTypeId];
              if (!objectType) return null;

              return (
                <MapObject
                  key={uuid}
                  uuid={uuid}
                  mapObject={mapObject}
                  objectType={objectType}
                  playerPosition={playerPosition}
                  stageSize={stageSize}
                  isEditing={isEditing}
                  onUpdatePosition={handleUpdatePosition}
                />
              );
            })}
        </Layer>
      </Stage>
    </div>
  );
}
