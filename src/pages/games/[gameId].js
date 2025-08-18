import Head from "next/head";
import { Geist, Geist_Mono } from "next/font/google";
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import _ from 'lodash';
import HUD from '@/components/HUD';
import Map from '@/components/Map';
import ActionModal from '@/components/ActionModal';

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
  const [selectedPolygonId, setSelectedPolygonId] = useState(null);

  // Get player data
  const player = game?.players?.[session.user.id];

  // Polygon drawing state
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [currentPolygonPoints, setCurrentPolygonPoints] = useState([]);

  // Action system state
  const [nearbyInteractiveElements, setNearbyInteractiveElements] = useState([]);
  const [activeAction, setActiveAction] = useState(null); // { type: 'craft'|'sell'|'buy', elementType: {...} }

  // Create refs for state to avoid race conditions
  const stateRef = useRef({
    game: null,
    elementTypes: {},
    player: null
  });

  // Track next element ID for map elements
  const [nextElementId, setNextElementId] = useState(1);

  const router = useRouter();
  const { gameId } = router.query;

  // Handle escape key and deselection
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedPolygonId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle deselection when clicking empty space
  const handleDeselectAll = () => {
    setSelectedPolygonId(null);
  };

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
        stateRef.current.player = gameData?.players?.[session.user.id] || null;

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

        // Ensure player data exists on mount
        await ensurePlayerData();
      }

      fetchGameData();
    }
  }, [gameId]);

  var updateGame = async (updatedGame, {updateSupabase = true, updateState = true} = {}) => {
    if (updateState) {
      setGame(updatedGame);
      stateRef.current.game = updatedGame;
      stateRef.current.player = updatedGame?.players?.[session.user.id] || null;
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
    stateRef.current.player = updatedGame?.players?.[session.user.id] || null;

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

    const worldX = player.position.x + relativeX;
    const worldY = player.position.y + relativeY;

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

  // Detect nearby interactive elements
  useEffect(() => {
    if (!stateRef.current.game || !stateRef.current.elementTypes || isEditing || !stateRef.current.player) {
      setNearbyInteractiveElements([]);
      return;
    }

    const interactionDistance = 60; // Distance in pixels for interaction
    const mapElements = stateRef.current.game.map?.elements || {};
    const nearby = [];

    Object.entries(mapElements).forEach(([elementId, mapElement]) => {
      const [elementTypeId, x, y] = mapElement;
      const elementType = stateRef.current.elementTypes[elementTypeId];

      if (!elementType || !elementType.data.actions) return;

      // Check if any actions are enabled
      const hasActions = elementType.data.actions.craft === 1 ||
                        elementType.data.actions.sell === 1 ||
                        elementType.data.actions.buy === 1;

      if (!hasActions) return;

      // Calculate distance from player
      const distance = Math.sqrt(
        Math.pow(x - stateRef.current.player.position.x, 2) +
        Math.pow(y - stateRef.current.player.position.y, 2)
      );

      if (distance <= interactionDistance) {
        nearby.push({
          elementId,
          elementTypeId,
          elementType,
          distance,
          x,
          y
        });
      }
    });

    // Sort by distance (closest first)
    nearby.sort((a, b) => a.distance - b.distance);
    setNearbyInteractiveElements(nearby);
  }, [game, elementTypes, isEditing]);

  // Helper function to ensure player data exists
  const ensurePlayerData = async () => {
    const currentGame = stateRef.current.game;
    let playerData = currentGame.players?.[session.user.id];

    if (!playerData) {
      // Create new player data
      playerData = {
        inventory: {},
        money: 100,
        position: { x: 0, y: 0 }
      };

      const updatedPlayers = {
        ...currentGame.players,
        [session.user.id]: playerData
      };

      const updatedGame = {
        ...currentGame,
        players: updatedPlayers
      };

      await updateGame(updatedGame);
      return playerData;
    }

    return playerData;
  };

  // Action handlers
  const handleCraft = async (elementType) => {
    setActiveAction({ type: 'craft', elementType });
  };

  const handleSell = async (elementType) => {
    setActiveAction({ type: 'sell', elementType });
  };

  const handleBuy = async (elementType) => {
    setActiveAction({ type: 'buy', elementType });
  };

  // Modal action handlers
  const handleModalAction = async (itemElementType) => {
    if (!activeAction) return;

    const playerData = await ensurePlayerData();
    const currentGame = stateRef.current.game;

    if (activeAction.type === 'craft') {
      const craftingRequirements = itemElementType.data.craftingRequirements || {};
      const playerInventory = playerData.inventory || {};

      // Check if player has all required items
      for (const [reqElementTypeId, requiredQuantity] of Object.entries(craftingRequirements)) {
        const playerQuantity = playerInventory[reqElementTypeId] || 0;
        if (playerQuantity < requiredQuantity) {
          const requiredElementType = elementTypes[reqElementTypeId];
          const itemName = requiredElementType?.data?.title || `Item ${reqElementTypeId}`;
          alert(`You need ${requiredQuantity} ${itemName} but only have ${playerQuantity}`);
          return;
        }
      }

      // Consume required items
      const updatedInventory = { ...playerInventory };
      for (const [reqElementTypeId, requiredQuantity] of Object.entries(craftingRequirements)) {
        updatedInventory[reqElementTypeId] -= requiredQuantity;
        if (updatedInventory[reqElementTypeId] <= 0) {
          delete updatedInventory[reqElementTypeId];
        }
      }

      // Add crafted item to inventory
      const craftedItemId = itemElementType.id.toString();
      updatedInventory[craftedItemId] = (updatedInventory[craftedItemId] || 0) + 1;

      // Update game data
      const updatedPlayers = {
        ...currentGame.players,
        [session.user.id]: {
          ...playerData,
          inventory: updatedInventory
        }
      };

      await updateGame({ ...currentGame, players: updatedPlayers });
      alert(`Crafted 1 ${itemElementType.data.title}!`);

    } else if (activeAction.type === 'sell') {
      const playerInventory = playerData.inventory || {};
      const itemId = itemElementType.id.toString();
      const playerQuantity = playerInventory[itemId] || 0;

      if (playerQuantity <= 0) {
        alert(`You don't have any ${itemElementType.data.title} to sell`);
        return;
      }

      const sellPrice = itemElementType.data.price || 10;

      // Remove item from inventory
      const updatedInventory = { ...playerInventory };
      updatedInventory[itemId] -= 1;
      if (updatedInventory[itemId] <= 0) {
        delete updatedInventory[itemId];
      }

      // Add money
      const updatedMoney = (playerData.money || 0) + sellPrice;

      // Update game data
      const updatedPlayers = {
        ...currentGame.players,
        [session.user.id]: {
          ...playerData,
          inventory: updatedInventory,
          money: updatedMoney
        }
      };

      await updateGame({ ...currentGame, players: updatedPlayers });
      alert(`Sold 1 ${itemElementType.data.title} for ${sellPrice} coins!`);

    } else if (activeAction.type === 'buy') {
      const buyPrice = itemElementType.data.price || 10;
      const playerMoney = playerData.money || 0;

      if (playerMoney < buyPrice) {
        alert(`You need ${buyPrice} coins but only have ${playerMoney}`);
        return;
      }

      // Add item to inventory
      const updatedInventory = { ...playerData.inventory };
      const itemId = itemElementType.id.toString();
      updatedInventory[itemId] = (updatedInventory[itemId] || 0) + 1;

      // Subtract money
      const updatedMoney = playerMoney - buyPrice;

      // Update game data
      const updatedPlayers = {
        ...currentGame.players,
        [session.user.id]: {
          ...playerData,
          inventory: updatedInventory,
          money: updatedMoney
        }
      };

      await updateGame({ ...currentGame, players: updatedPlayers });
      alert(`Bought 1 ${itemElementType.data.title} for ${buyPrice} coins!`);
    }

    setActiveAction(null);
  };

  return game && player && (
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
          player={player}
          selectedPolygonId={selectedPolygonId}
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
          player={player}
          selectedPolygonId={selectedPolygonId}
          setSelectedPolygonId={setSelectedPolygonId}
          onDeselectAll={handleDeselectAll}
          session={session}
        />

        {/* Action Buttons - bottom center when near interactive elements */}
        {!isEditing && nearbyInteractiveElements.length > 0 && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'center'
          }}>
            {nearbyInteractiveElements.slice(0, 1).map(({ elementType, elementId }) => (
              <div key={elementId} style={{
                backgroundColor: 'rgba(230, 226, 210, 0.95)',
                border: '2px solid #8B7355',
                borderRadius: '8px',
                padding: '15px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                alignItems: 'center',
                minWidth: '200px'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#4A4A4A',
                  textAlign: 'center'
                }}>
                  {elementType.data.title || 'Interactive Element'}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {elementType.data.actions?.craft === 1 && (
                    <button
                      onClick={() => handleCraft(elementType)}
                      style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Craft
                    </button>
                  )}

                  {elementType.data.actions?.sell === 1 && (
                    <button
                      onClick={() => handleSell(elementType)}
                      style={{
                        backgroundColor: '#FF9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Sell
                    </button>
                  )}

                  {elementType.data.actions?.buy === 1 && (
                    <button
                      onClick={() => handleBuy(elementType)}
                      style={{
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Buy
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Modal */}
        <ActionModal
          activeAction={activeAction}
          onClose={() => setActiveAction(null)}
          onAction={handleModalAction}
          elementTypes={elementTypes}
          player={player}
        />
      </div>
    </>
  );
}
