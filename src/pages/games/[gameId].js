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
  var [elementTypes, _setElementTypes] = useState({});
  var [drawingMode, setDrawingMode] = useState(false);
  var [selectedMaterialId, setSelectedMaterialId] = useState(null);

  // Map state moved up from Map component
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0 });

  // Create refs for state to avoid race conditions
  const stateRef = useRef({
    game: null,
    elementTypes: {}
  });

  // Track next element ID for map elements
  const [nextElementId, setNextElementId] = useState(1);

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

        // Calculate next element ID from existing map
        const existingIds = Object.keys(gameData.map.elements).map(id => parseInt(id) || 0);
        const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
        setNextElementId(maxId + 1);

        // Fetch element types for this game using element_type_ids
        if (gameData.element_type_ids && gameData.element_type_ids.length > 0) {
          const { data: elementTypesData, error: elementTypesError } = await supabase
            .from('element_types')
            .select('*')
            .in('id', gameData.element_type_ids);

          if (elementTypesError) {
            console.log(elementTypesError);
            return;
          }

          // Convert array to object with id as key, preserving full element type structure
          const elementTypesObj = _.keyBy(elementTypesData, 'id');

          setElementTypes(elementTypesObj);

          stateRef.current.elementTypes = elementTypesObj;
        }
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

  const setElementTypes = (newElementTypes) => {
    _setElementTypes(newElementTypes);
    stateRef.current.elementTypes = newElementTypes;
  }

  // Shared drag state
  const [dragState, setDragState] = useState({
    isDragging: false,
    dragElementId: null,
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

  const handleDragStart = (elementId, startPos, isHUDDrag = false) => {
    setDragState({
      isDragging: true,
      dragElementId: elementId,
      startPos: startPos,
      isHUDDrag: isHUDDrag
    });
  };

  const handleDragMove = (elementId, newPos) => {
    if (dragState.isDragging && dragState.dragElementId === elementId) {
      // Only convert coordinates for HUD drag-to-create, MapObject handles its own coordinates
      const worldPos = dragState.isHUDDrag ? pageToWorldCoordinates(newPos.x, newPos.y) : newPos;

      // Update the element position immediately for responsive UI
      const currentElements = game.map?.elements || {};
      const existingElement = currentElements[elementId];
      if (existingElement) {
        const updatedElements = {
          ...currentElements,
          [elementId]: [existingElement[0], worldPos.x, worldPos.y] // [elementTypeId, x, y]
        };
        const updatedMap = {
          elements: updatedElements,
          boundaryPolygon: game.map?.boundaryPolygon || null
        };
        updateGame({ ...game, map: updatedMap }, { updateSupabase: false, updateState: true });
      }
    }
  };

  const handleDragEnd = (elementId, finalPos) => {
    if (dragState.isDragging && dragState.dragElementId === elementId) {
      // Only convert coordinates for HUD drag-to-create, MapObject handles its own coordinates
      const worldPos = dragState.isHUDDrag ? pageToWorldCoordinates(finalPos.x, finalPos.y) : finalPos;

      // Final update to database
      const currentElements = game.map?.elements || {};
      const existingElement = currentElements[elementId];
      if (existingElement) {
        const updatedElements = {
          ...currentElements,
          [elementId]: [existingElement[0], worldPos.x, worldPos.y] // [elementTypeId, x, y]
        };
        const updatedMap = {
          elements: updatedElements,
          boundaryPolygon: game.map?.boundaryPolygon || null
        };
        updateGame({ ...game, map: updatedMap }, { updateSupabase: true, updateState: true });
      }

      setDragState({
        isDragging: false,
        dragElementId: null,
        startPos: null,
        isHUDDrag: false
      });
    }
  };

  // Helper function to create new map element
  const createMapElement = (elementTypeId, x = 0, y = 0) => {
    const elementId = nextElementId.toString();
    setNextElementId(prev => prev + 1);

    const currentGame = stateRef.current.game;
    const currentElements = currentGame.map.elements || {};
    const updatedElements = {
      ...currentElements,
      [elementId]: [elementTypeId, x, y]
    };
    const updatedMap = {
      elements: updatedElements,
      boundaryPolygon: currentGame.map.boundaryPolygon || null
    };

    return { elementId, updatedMap };
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
          elementTypes={elementTypes}
          setElementTypes={setElementTypes}
          session={session}
          drawingMode={drawingMode}
          setDrawingMode={setDrawingMode}
          selectedMaterialId={selectedMaterialId}
          setSelectedMaterialId={setSelectedMaterialId}
          stateRef={stateRef}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          createMapElement={createMapElement}
        />
        <Map
          game={game}
          elementTypes={elementTypes}
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
          playerPosition={playerPosition}
          setPlayerPosition={setPlayerPosition}
        />
      </div>
    </>
  );
}
