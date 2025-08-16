
import Head from "next/head";
import { Geist, Geist_Mono } from "next/font/google";
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import _ from 'lodash';
import HUD from '@/components/HUD';
import Map from '@/components/Map';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function GamePage({session}) {
  var [game, setGame] = useState(null);
  var [isEditing, setIsEditing] = useState(false);
  var [objectTypes, _setObjectTypes] = useState({});
  var [drawingMode, setDrawingMode] = useState(false);
  var [selectedMaterialId, setSelectedMaterialId] = useState(null);

  // Map state moved up from Map component
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0 });

  // Create refs for state to avoid race conditions
  const stateRef = useRef({
    game: null,
    objectTypes: {}
  });

  const router = useRouter();
  const { gameId } = router.query;

  useEffect(() => {
    if (gameId) {
      async function fetchGameData() {
        // Fetch game
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .eq('user_id', session.user.id)
          .single();

        if (gameError) {
          console.log(gameError);
          return;
        }

        setGame(gameData);
        stateRef.current.game = gameData;

        // Fetch object types for this game
        const { data: objectTypesData, error: objectTypesError } = await supabase
          .from('object_types')
          .select('*')
          .eq('game_id', gameId);

        if (objectTypesError) {
          console.log(objectTypesError);
          return;
        }

        // Convert array to object with id as key
        const objectTypesObj = {};
        objectTypesData.forEach(ot => {
          objectTypesObj[ot.id] = ot.data;
        });
        setObjectTypes(objectTypesObj);
        stateRef.current.objectTypes = objectTypesObj;
      }

      fetchGameData();
    }
  }, [gameId]);

  var updateGame = async (updatedGame, {updateSupabase = true, updateState = true} = {}) => {
    if (updateState) {
      setGame(updatedGame);
      stateRef.current.game = updatedGame;
    }

    if (updateSupabase) {
      const { data, error } = await supabase
        .from('games')
        .update(updatedGame)
        .eq('id', gameId)
        .eq('user_id', session.user.id);
    }
  }

  // Debounced version for drawing materials
  const debouncedUpdateGame = _.debounce(async (updatedGame) => {
    const { data, error } = await supabase
      .from('games')
      .update(updatedGame)
      .eq('id', gameId)
      .eq('user_id', session.user.id);
  }, 500);

  // Function for drawing that updates state immediately but debounces database updates
  const updateGameForDrawing = (updatedGame) => {
    // Update state immediately for responsive UI
    setGame(updatedGame);
    stateRef.current.game = updatedGame;

    // Debounce the database update
    debouncedUpdateGame(updatedGame);
  }

  const setObjectTypes = (newObjectTypes) => {
    _setObjectTypes(newObjectTypes);
    stateRef.current.objectTypes = newObjectTypes;
  }

  // Shared drag state
  const [dragState, setDragState] = useState({
    isDragging: false,
    dragObjectId: null,
    startPos: null,
    isHUDDrag: false // Track if this is a HUD drag-to-create
  });

  // Grid snap size
  const GRID_SIZE = 20;
  const snapToGrid = (value) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // Convert page coordinates to world coordinates (only for HUD drag-to-create)
  const pageToWorldCoordinates = (pageX, pageY) => {
    // Convert page coordinates to world coordinates
    const screenCenterX = stageSize.width / 2;
    const screenCenterY = stageSize.height / 2;

    // Calculate relative position from screen center
    const relativeX = pageX - screenCenterX;
    const relativeY = pageY - screenCenterY;

    const worldX = playerPosition.x + relativeX;
    const worldY = playerPosition.y + relativeY;

    // Snap to grid for consistent positioning
    return {
      x: snapToGrid(worldX),
      y: snapToGrid(worldY)
    };
  };

  const handleDragStart = (objectId, startPos, isHUDDrag = false) => {
    setDragState({
      isDragging: true,
      dragObjectId: objectId,
      startPos: startPos,
      isHUDDrag: isHUDDrag
    });
  };

  const handleDragMove = (objectId, newPos) => {
    if (dragState.isDragging && dragState.dragObjectId === objectId) {
      // Only convert coordinates for HUD drag-to-create, MapObject handles its own coordinates
      const worldPos = dragState.isHUDDrag ? pageToWorldCoordinates(newPos.x, newPos.y) : newPos;

      // Update the object position immediately for responsive UI
      const gameData = game.data;
      const updatedGameData = {
        ...gameData,
        mapObjects: {
          ...gameData.mapObjects,
          [objectId]: {
            ...gameData.mapObjects[objectId],
            x: worldPos.x,
            y: worldPos.y
          }
        }
      };
      updateGame({ ...game, data: updatedGameData }, { updateSupabase: false, updateState: true });
    }
  };

  const handleDragEnd = (objectId, finalPos) => {
    if (dragState.isDragging && dragState.dragObjectId === objectId) {
      // Only convert coordinates for HUD drag-to-create, MapObject handles its own coordinates
      const worldPos = dragState.isHUDDrag ? pageToWorldCoordinates(finalPos.x, finalPos.y) : finalPos;

      // Final update to database
      const gameData = game.data;
      const updatedGameData = {
        ...gameData,
        mapObjects: {
          ...gameData.mapObjects,
          [objectId]: {
            ...gameData.mapObjects[objectId],
            x: worldPos.x,
            y: worldPos.y
          }
        }
      };
      updateGame({ ...game, data: updatedGameData }, { updateSupabase: true, updateState: true });

      setDragState({
        isDragging: false,
        dragObjectId: null,
        startPos: null,
        isHUDDrag: false
      });
    }
  };

  return game && (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div
        className={`${geistSans.variable} ${geistMono.variable}`}
      >
        <HUD
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          game={game}
          updateGame={updateGame}
          objectTypes={objectTypes}
          setObjectTypes={setObjectTypes}
          session={session}
          drawingMode={drawingMode}
          setDrawingMode={setDrawingMode}
          selectedMaterialId={selectedMaterialId}
          setSelectedMaterialId={setSelectedMaterialId}
          stateRef={stateRef}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
        <Map
          game={game}
          objectTypes={objectTypes}
          isEditing={isEditing}
          updateGame={updateGame}
          debouncedUpdateGame={updateGameForDrawing}
          drawingMode={drawingMode}
          selectedMaterialId={selectedMaterialId}
          stateRef={stateRef}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          stageSize={stageSize}
          setStageSize={setStageSize}
          zoom={zoom}
          setZoom={setZoom}
          offset={offset}
          setOffset={setOffset}
          playerPosition={playerPosition}
          setPlayerPosition={setPlayerPosition}
        />
      </div>
    </>
  );
}
