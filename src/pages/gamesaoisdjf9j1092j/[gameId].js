import Head from "next/head";
import { Geist, Geist_Mono } from "next/font/google";
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import _ from 'lodash';
import HUD from '@/components/HUD';
import Map from '@/components/Map';
import ActionModal from '@/components/ActionModal';
import FilmNoise from '@/components/FilmNoise';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function GamePage({session, userProfile}) {

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
  const [nearbyInteractiveElementIds, _setNearbyInteractiveElementIds] = useState([]);
  const [activeAction, setActiveAction] = useState(null); // { type: 'craft'|'sell'|'buy'|'build', elementType: {...} }
  const [tentativeMapObject, setTentativeMapObject] = useState(null); // { elementTypeId, x, y }

  const setNearbyInteractiveElementIds = (newIds) => {
    _setNearbyInteractiveElementIds(newIds);
    stateRef.current.nearbyInteractiveElementIds = newIds;
  };

  // Create refs for state to avoid race conditions
  const stateRef = useRef({
    game: null,
    elementTypes: {},
    player: null,
    nearbyInteractiveElementIds: []
  });

  // Track next element ID for map elements
  const [nextElementId, setNextElementId] = useState(1);

  const router = useRouter();
  const { gameId } = router.query;

  // Handle polygon deletion
  const handleDeletePolygon = async (polygonId) => {
    // Remove the polygon from game.background
    const updatedBackground = {...stateRef.current.game.background};

    delete updatedBackground[polygonId];

    const updatedGame = {
      ...stateRef.current.game,
      background: updatedBackground
    };

    // Update the game state and database
    await updateGame(updatedGame);

    // Clear the selection
    setSelectedPolygonId(null);
  };

  // Handle escape key and deselection
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if user is typing in an input field or if a modal is open
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );

      // Check if any modal dialogs are open (ElementTypeEditor has z-index 1000)
      const hasModalOpen = document.querySelector('[style*="z-index: 1000"]') !== null;

      if (e.key === 'Escape') {
        setSelectedPolygonId(null);
        setTentativeMapObject(null); // Clear tentative building on escape
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && selectedPolygonId && isEditing && !isInputFocused && !hasModalOpen) {
        // Delete the selected polygon only if no inputs focused and no modals open
        e.preventDefault();
        handleDeletePolygon(selectedPolygonId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPolygonId, isEditing]);

  // Handle mouse movement for tentative building placement
  useEffect(() => {
    if (!tentativeMapObject) return;

    const handleMouseMove = (e) => {
      const worldPos = pageToWorldCoordinates(e.clientX, e.clientY);
      setTentativeMapObject(prev => ({
        ...prev,
        x: worldPos.x,
        y: worldPos.y
      }));
    };

    const handleClick = async (e) => {
      if (!tentativeMapObject) return;

      const playerData = await ensurePlayerData();
      const currentGame = stateRef.current.game;
      const buildingElementType = elementTypes[tentativeMapObject.elementTypeId];

      if (!buildingElementType) return;

      const buildingRequirements = buildingElementType.data.buildingRequirements || {};
      let updatedInventory = { ...playerData.inventory };

      // Consume required items
      for (const [reqElementTypeId, requiredQuantity] of Object.entries(buildingRequirements)) {
        updatedInventory[reqElementTypeId] -= requiredQuantity;
        if (updatedInventory[reqElementTypeId] <= 0) {
          delete updatedInventory[reqElementTypeId];
        }
      }

      // Create the building at tentative position
      const { elementId, updatedMap } = createMapElement(tentativeMapObject.elementTypeId, tentativeMapObject.x, tentativeMapObject.y);

      // Update game data
      const updatedPlayers = {
        ...currentGame.players,
        [session.user.id]: {
          ...playerData,
          inventory: updatedInventory
        }
      };

      await updateGame({
        ...currentGame,
        players: updatedPlayers,
        map: updatedMap
      });

      alert(`Built ${buildingElementType.data.title}!`);
      setTentativeMapObject(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
    };
  }, [tentativeMapObject, elementTypes, player]);

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

        // Determine if this is a game definition or instance
        const isGameDefinition = !gameData.source_game_id;
        const isGameInstance = !!gameData.source_game_id;

        // Set editing mode based on game type
        setIsEditing(isGameDefinition);

        // Fetch element types - from this game if definition, from source game if instance
        const elementTypeGameId = isGameInstance ? gameData.source_game_id : gameId;

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
        } else if (isGameInstance && gameData.source_game_id) {
          // For game instances, fetch element types from the source game
          const { data: sourceGameData, error: sourceGameError } = await supabase
            .from('games')
            .select('element_type_ids')
            .eq('id', gameData.source_game_id)
            .single();

          if (!sourceGameError && sourceGameData?.element_type_ids?.length > 0) {
            const { data: elementTypesData, error: elementTypesError } = await supabase
              .from('element_types')
              .select('*')
              .in('id', sourceGameData.element_type_ids);

            if (!elementTypesError) {
              const elementTypesObj = _.keyBy(elementTypesData, 'id');
              setElementTypes(elementTypesObj);
              stateRef.current.elementTypes = elementTypesObj;
            }
          }
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
      setNearbyInteractiveElementIds([]);
      return;
    }

    const interactionDistance = 10; // Distance in pixels for interaction
    const mapElements = stateRef.current.game.map?.elements || {};
    const nearby = [];

    Object.entries(mapElements).forEach(([elementId, mapElement]) => {
      const [elementTypeId, x, y] = mapElement;
      const elementType = stateRef.current.elementTypes[elementTypeId];

      if (!elementType) return;

      // Check if any actions are enabled
      const hasActions = elementType.data.actions?.craft === 1 ||
                        elementType.data.actions?.sell === 1 ||
                        elementType.data.actions?.buy === 1
                        || elementType.data.type === 'item';

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

        console.log(hasToolData, 'has tool data', {
          elementId,
          elementTypeId,
          distance,
          x,
          y,
          hasToolData: hasCompatibleTool
        })
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
    setNearbyInteractiveElementIds(nearby);
  }, [game, elementTypes, isEditing, player?.inventory]);

  // Helper function to ensure player data exists
  const ensurePlayerData = async () => {
    const currentGame = stateRef.current.game;
    let playerData = currentGame.players?.[session.user.id];
    let gameNeedsUpdate = false;
    let updatedGame = { ...currentGame };

    // Initialize game time if it doesn't exist
    if (!currentGame.time) {
      updatedGame.time = {
        day: 1,
        hour: 6,
        minute: 0
      };
      gameNeedsUpdate = true;
    }

    if (!playerData) {
      // Create initial inventory from element types with initialInventoryQuantity
      const initialInventory = {};
      const currentElementTypes = stateRef.current.elementTypes;

      if (currentElementTypes) {
        Object.entries(currentElementTypes).forEach(([elementTypeId, elementType]) => {
          const initialQuantity = elementType.data?.initialInventoryQuantity;
          if (initialQuantity && initialQuantity > 0) {
            initialInventory[elementTypeId] = initialQuantity;
          }
        });
      }

      // Create new player data
      playerData = {
        inventory: initialInventory,
        money: 100,
        position: { x: 0, y: 0 }
      };

      const updatedPlayers = {
        ...updatedGame.players,
        [session.user.id]: playerData
      };

      updatedGame = {
        ...updatedGame,
        players: updatedPlayers
      };
      gameNeedsUpdate = true;
    }

    if (gameNeedsUpdate) {
      await updateGame(updatedGame);
    }

    return playerData;
  };

  // Time advancement function
  const advanceTime = async (minutes) => {
    const currentGame = stateRef.current.game;
    if (!currentGame?.time) return;

    let { day, hour, minute } = currentGame.time;
    minute += minutes;

    // Handle minute overflow
    while (minute >= 60) {
      minute -= 60;
      hour += 1;
    }

    // Handle hour overflow (day ends at 21:00, new day starts at 6:00)
    while (hour >= 21) {
      hour = 6; // Reset to 6 AM
      day += 1;

      // TODO: Add end-of-day processing here
      // - AI generation for weather, events, challenges
      // - Screen blackout transition
      // - Game state analysis and bonus rewards
      console.log(`End of day ${day - 1}! Starting day ${day}`);
    }

    const updatedTime = { day, hour, minute };
    const updatedGame = {
      ...currentGame,
      time: updatedTime
    };

    await updateGame(updatedGame, { updateSupabase: true, updateState: true });
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

  const handleBuild = async () => {
    setActiveAction({ type: 'build', elementType: null });
  };

  const handlePlayNewInstance = async () => {
    try {
      // Create a new game instance based on the current game definition
      const newGameData = {
        user_id: session.user.id,
        source_game_id: gameId, // Reference to the source game definition
        element_type_ids: game.element_type_ids, // Copy element type IDs
        map: {
          elements: { ...game.map.elements }, // Copy map elements from the definition
          boundaryPolygon: game.map.boundaryPolygon || null // Copy boundary if exists
        },
        background: game.background || {}, // Copy background
        players: {}, // Empty players object - will be populated when player joins
        time: {
          day: 1,
          hour: 6,
          minute: 0
        }
      };

      const { data: newGame, error } = await supabase
        .from('games')
        .insert(newGameData)
        .select()
        .single();

      if (error) {
        console.error('Error creating game instance:', error);
        alert('Failed to create game instance. Please try again.');
        return;
      }

      // Navigate to the new game instance
      router.push(`/games/${newGame.id}`);
    } catch (error) {
      console.error('Error creating game instance:', error);
      alert('Failed to create game instance. Please try again.');
    }
  };

  const handleUseTool = async (elementId, toolElementTypeId) => {
    const playerData = await ensurePlayerData();
    const currentGame = stateRef.current.game;

    // Get the map element and its type
    const mapElement = currentGame.map.elements[elementId];
    if (!mapElement) return;

    const [elementTypeId, x, y] = mapElement;
    const elementType = elementTypes[elementTypeId];
    if (!elementType || !elementType.data.toolData || !elementType.data.toolData[toolElementTypeId]) return;

    const toolConfig = elementType.data.toolData[toolElementTypeId];
    const toolElementType = elementTypes[toolElementTypeId];

    // Check if player has the tool
    if (!playerData.inventory[toolElementTypeId] || playerData.inventory[toolElementTypeId] <= 0) {
      alert(`You don't have a ${toolElementType?.data?.title || 'tool'} to use!`);
      return;
    }

    let updatedInventory = { ...playerData.inventory };
    let updatedMoney = playerData.money || 0;
    let canUseTool = true;

    // Check if player can afford the costs
    for (const [costElementTypeId, costAmount] of Object.entries(toolConfig.cost || {})) {
      if (costAmount < 0) {
        // Player loses this item/stat
        const available = updatedInventory[costElementTypeId] || 0;
        if (available < Math.abs(costAmount)) {
          const costElementType = elementTypes[costElementTypeId];
          alert(`You need ${Math.abs(costAmount)} ${costElementType?.data?.title || 'items'} but only have ${available}!`);
          canUseTool = false;
          break;
        }
      }
    }

    if (!canUseTool) return;

    // Apply costs
    for (const [costElementTypeId, costAmount] of Object.entries(toolConfig.cost || {})) {
      if (costAmount !== 0) {
        updatedInventory[costElementTypeId] = (updatedInventory[costElementTypeId] || 0) + costAmount;
        if (updatedInventory[costElementTypeId] <= 0) {
          delete updatedInventory[costElementTypeId];
        }
      }
    }

    // Transform the element if specified
    let updatedElements = { ...currentGame.map.elements };
    if (toolConfig.newElementTypeId) {
      updatedElements[elementId] = [toolConfig.newElementTypeId, x, y];
    } else {
      // If no transformation specified, remove the element
      delete updatedElements[elementId];
    }

    // Update game state
    const updatedPlayers = {
      ...currentGame.players,
      [session.user.id]: {
        ...playerData,
        inventory: updatedInventory,
        money: updatedMoney
      }
    };

    const updatedMap = {
      elements: updatedElements,
      boundaryPolygon: currentGame.map.boundaryPolygon || null
    };

    await updateGame({
      ...currentGame,
      players: updatedPlayers,
      map: updatedMap
    });

    const newElementType = elementTypes[toolConfig.newElementTypeId];
    const transformMessage = toolConfig.newElementTypeId ?
      ` and transformed into ${newElementType?.data?.title || 'something'}` :
      ' and was removed';

    alert(`Used ${toolElementType?.data?.title || 'tool'} on ${elementType.data.title}${transformMessage}!`);
  };

  // Modal action handlers
  const handleModalAction = async (actionData) => {
    if (!activeAction) return;

    const playerData = await ensurePlayerData();
    const currentGame = stateRef.current.game;

    // Handle building selection
    if (actionData.buildingId && actionData.type === 'build') {
      const buildingElementType = elementTypes[actionData.buildingId];
      if (!buildingElementType) return;

      const buildingRequirements = buildingElementType.data.buildingRequirements || {};
      let canBuild = true;

      // Check if player has all required items
      for (const [reqElementTypeId, requiredQuantity] of Object.entries(buildingRequirements)) {
        const playerQuantity = playerData.inventory[reqElementTypeId] || 0;
        if (playerQuantity < requiredQuantity) {
          const requiredElementType = elementTypes[reqElementTypeId];
          const itemName = requiredElementType?.data?.title || `Item ${reqElementTypeId}`;
          alert(`You need ${requiredQuantity} ${itemName} but only have ${playerQuantity}`);
          canBuild = false;
          break;
        }
      }

      if (!canBuild) return;

      // Set tentative map object for building placement
      setTentativeMapObject({
        elementTypeId: actionData.buildingId,
        x: player.position.x,
        y: player.position.y
      });

      setActiveAction(null);
      return;
    }

    // Handle new batch operations format
    if (actionData.quantities && actionData.type) {
      const { quantities, type } = actionData;
      let updatedInventory = { ...playerData.inventory };
      let updatedMoney = playerData.money || 0;
      let totalProcessed = 0;

      if (type === 'craft') {
        // Process all craft operations
        for (const [itemId, quantity] of Object.entries(quantities)) {
          if (quantity <= 0) continue;

          const itemElementType = elementTypes[itemId];
          if (!itemElementType) continue;

          const craftingRequirements = itemElementType.data.craftingRequirements || {};

          // Check if we have enough materials for this quantity
          let canCraft = true;
          for (const [reqElementTypeId, reqQty] of Object.entries(craftingRequirements)) {
            const totalRequired = reqQty * quantity;
            const available = updatedInventory[reqElementTypeId] || 0;
            if (available < totalRequired) {
              canCraft = false;
              break;
            }
          }

          if (!canCraft) continue;

          // Consume required items
          for (const [reqElementTypeId, reqQty] of Object.entries(craftingRequirements)) {
            const totalRequired = reqQty * quantity;
            console.log(totalRequired, reqQty, quantity, reqElementTypeId, updatedInventory);
            updatedInventory[reqElementTypeId] -= totalRequired;
            if (updatedInventory[reqElementTypeId] <= 0) {
              delete updatedInventory[reqElementTypeId];
            }
          }

          // Add crafted items to inventory
          const outputQuantity = itemElementType.data?.craftingOutputQuantity || 1;
          const totalOutput = outputQuantity * quantity;
          updatedInventory[itemId] = (updatedInventory[itemId] || 0) + totalOutput;
          totalProcessed += totalOutput;
        }

        if (totalProcessed > 0) {
          alert(`Crafted ${totalProcessed} items!`);
        }

      } else if (type === 'sell') {
        let totalEarnings = 0;

        // Process all sell operations
        for (const [itemId, quantity] of Object.entries(quantities)) {
          if (quantity <= 0) continue;

          const itemElementType = elementTypes[itemId];
          if (!itemElementType) continue;

          const available = updatedInventory[itemId] || 0;
          const actualQuantity = Math.min(quantity, available);

          if (actualQuantity <= 0) continue;

          const sellPrice = itemElementType.data.price || 0;
          const earnings = sellPrice * actualQuantity;

          // Remove items from inventory
          updatedInventory[itemId] -= actualQuantity;
          if (updatedInventory[itemId] <= 0) {
            delete updatedInventory[itemId];
          }

          // Add money
          updatedMoney += earnings;
          totalEarnings += earnings;
          totalProcessed += actualQuantity;
        }

        if (totalProcessed > 0) {
          alert(`Sold ${totalProcessed} items for $${totalEarnings}!`);
        }

      } else if (type === 'buy') {
        let totalCost = 0;

        // Calculate total cost first
        for (const [itemId, quantity] of Object.entries(quantities)) {
          if (quantity <= 0) continue;
          const itemElementType = elementTypes[itemId];
          if (!itemElementType) continue;
          const price = itemElementType.data.price || 0;
          totalCost += price * quantity;
        }

        if (totalCost > updatedMoney) {
          alert(`Not enough money! Need $${totalCost} but only have $${updatedMoney}`);
          return;
        }

        // Process all buy operations
        for (const [itemId, quantity] of Object.entries(quantities)) {
          if (quantity <= 0) continue;

          const itemElementType = elementTypes[itemId];
          if (!itemElementType) continue;

          const price = itemElementType.data.price || 0;
          const cost = price * quantity;

          // Add items to inventory
          updatedInventory[itemId] = (updatedInventory[itemId] || 0) + quantity;
          totalProcessed += quantity;
        }

        // Subtract total cost
        updatedMoney -= totalCost;

        if (totalProcessed > 0) {
          alert(`Bought ${totalProcessed} items for $${totalCost}!`);
        }
      }

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
    } else {
      // Handle legacy single-item operations (fallback)
      const itemElementType = actionData;

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
        const outputQuantity = itemElementType.data?.craftingOutputQuantity || 1;
        updatedInventory[craftedItemId] = (updatedInventory[craftedItemId] || 0) + outputQuantity;

        // Update game data
        const updatedPlayers = {
          ...currentGame.players,
          [session.user.id]: {
            ...playerData,
            inventory: updatedInventory
          }
        };

        await updateGame({ ...currentGame, players: updatedPlayers });
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
    }

    setActiveAction(null);
  };

  // Compute nearby interactive elements from IDs and current elementTypes
  const nearbyInteractiveElements = nearbyInteractiveElementIds.map(({ elementId, elementTypeId, distance, x, y }) => {
    const elementType = elementTypes[elementTypeId];
    return elementType ? {element: {id: elementId}, elementType} : null;
  }).filter(Boolean);
  console.log(nearbyInteractiveElementIds, nearbyInteractiveElements);
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
        style={{
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Game Container - maxGameSize with centered positioning */}
        <div style={{
          position: 'relative',
          width: stageSize.width,
          height: stageSize.height,
          // backgroundColor: '#cdceac',
          backgroundColor: '#eee',
        }}>
          <HUD
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            game={game}
            updateGame={updateGame}
            elementTypes={elementTypes}
            setElementTypes={setElementTypes}
            session={session}
            userProfile={userProfile}
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
            nearbyInteractiveElements={nearbyInteractiveElements}
            onCraft={handleCraft}
            onSell={handleSell}
            onBuy={handleBuy}
            onBuild={handleBuild}
            onUseTool={handleUseTool}
            onPlayNewInstance={handlePlayNewInstance}
            stageSize={stageSize}
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
            setNearbyInteractiveElementIds={setNearbyInteractiveElementIds}
            advanceTime={advanceTime}
            tentativeMapObject={tentativeMapObject}
          />
        </div>

        {/* Action Modal */}
        <ActionModal
          activeAction={activeAction}
          onClose={() => setActiveAction(null)}
          onAction={handleModalAction}
          elementTypes={elementTypes}
          player={player}
        />

        {/* Film Noise Overlay */}
        <FilmNoise opacity={0.4} intensity={0.2} />
      </div>
    </>
  );
}
