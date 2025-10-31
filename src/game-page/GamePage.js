import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import _ from 'lodash';
import dynamic from 'next/dynamic';
import { Button } from './Button';
import { Currency } from './Currency';
import { ActionSelector } from './ActionSelector';
import { HistoryItem } from './HistoryItem';
import HUD from './HUD';
import { EventModal } from './EventModal';
import { getPrompt } from './getPrompt';
import { formatTime, calculateAvailableActions, findNearestObject } from './helpers';
import { getActionColor } from './actionColors';
import { handleClientAction, canHandleClientSide, validateInventory, checkGameOver, completeMinigameAction } from './clientActions';
import { updateCompletedQuests } from './questTracking';
import { primaryFont } from '../styles/fonts';
import styles from './GamePage.module.css';

const MapSimple = dynamic(() => import('../components/MapSimple'), { ssr: false });
const FilmNoise = dynamic(() => import('../components/FilmNoise'), { ssr: false });

export default function GamePage() {
  const router = useRouter();
  const { gameId } = router.query;

  // Force update mechanism
  const [, setUpdateTrigger] = useState(0);
  const forceUpdate = () => setUpdateTrigger(prev => prev + 1);

  // Loading overlay state
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(1);

  // Use refs instead of state for game and history
  const gameRef = useRef(null);
  const historyRef = useRef(null);
  const initialGameRef = useRef(null);

  // Initialize refs on first render
  if (gameRef.current === null && gameId) {
    if (typeof window !== 'undefined') {
      // Load game state
      const stateKey = `game-state-${gameId}`;
      const savedState = localStorage.getItem(stateKey);

      if (savedState) {
        try {
          gameRef.current = JSON.parse(savedState);
          // Keep a copy of initial state for reset
          initialGameRef.current = JSON.parse(savedState);
        } catch (e) {
          console.error('Failed to load game:', e);
          router.push('/');
        }
      } else {
        // Game state not found, redirect to home
        router.push('/');
      }
    }
  }

  if (historyRef.current === null && gameId) {
    if (typeof window !== 'undefined') {
      const historyKey = `game-history-${gameId}`;
      const saved = localStorage.getItem(historyKey);
      if (saved) {
        try {
          historyRef.current = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved history:', e);
          historyRef.current = [];
        }
      } else {
        historyRef.current = [];
      }
    }
  }

  // Fade out overlay effect
  React.useEffect(() => {
    // After 1 second, start fade out
    const fadeTimer = setTimeout(() => {
      setOverlayOpacity(0);
    }, 1000);

    // After 1.3 seconds (1000ms + 300ms transition), remove from DOM
    const removeTimer = setTimeout(() => {
      setShowOverlay(false);
    }, 1300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Methods to update refs
  const updateGame = (newGame, {save=true}={}) => {
    gameRef.current = newGame;

    // Check for game over
    const gameOverStatus = checkGameOver(newGame);
    if (gameOverStatus.isGameOver) {
      // Add game over message to story text
      newGame.instance.storyText = gameOverStatus.reason;
      // Optionally disable further actions by setting a game over flag
      newGame.instance.isGameOver = true;
    }

    if (typeof window !== 'undefined' && gameId && save) {
      localStorage.setItem(`game-state-${gameId}`, JSON.stringify(newGame));

      // Update last played timestamp
      const instanceKey = `game-instance-${gameId}`;
      const instanceData = localStorage.getItem(instanceKey);
      if (instanceData) {
        try {
          const instance = JSON.parse(instanceData);
          instance.lastPlayed = new Date().toISOString();
          localStorage.setItem(instanceKey, JSON.stringify(instance));
        } catch (e) {
          console.error('Failed to update last played:', e);
        }
      }
    }
    forceUpdate();
  };

  const updateHistory = (newHistory) => {
    historyRef.current = newHistory;
    if (typeof window !== 'undefined' && gameId) {
      localStorage.setItem(`game-history-${gameId}`, JSON.stringify(newHistory));
    }
    forceUpdate();
  };

  // Save to localStorage without updating UI
  var gameIdRef = useRef(null);

  gameIdRef.current = gameId;

  const saveToLocalStorage = (game) => {
    console.log(gameId, game)
    if (typeof window !== 'undefined' && gameIdRef.current) {
      localStorage.setItem(`game-state-${gameIdRef.current}`, JSON.stringify(game));
    }
  };

  // Debounced save using lodash - only saves to localStorage after movement stops
  const debouncedSave = useRef(_.debounce(saveToLocalStorage, 100)).current;

  // Update game in memory immediately, save to disk with debounce
  const updateGameWithDebounce = (newGame) => {
    // Check for game over
    const gameOverStatus = checkGameOver(newGame);
    if (gameOverStatus.isGameOver) {
      // Add game over message to story text
      newGame.instance.storyText = gameOverStatus.reason;
      // Optionally disable further actions by setting a game over flag
      newGame.instance.isGameOver = true;
    }

    gameRef.current = newGame;
    forceUpdate();
    debouncedSave(newGame);
  };

  const addToHistory = (historyItem) => {
    updateHistory([...historyRef.current, historyItem]);
  };

  var [isProcessing, setIsProcessing] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState('');
  const [selectedActionType, setSelectedActionType] = useState(null);
  const [redFlash, setRedFlash] = useState(false);
  const [activeEvent, setActiveEvent] = useState(null);

  const resetGame = () => {
    if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
      if (initialGameRef.current) {
        updateGame(JSON.parse(JSON.stringify(initialGameRef.current)));
        updateHistory([]);
      }
    }
  };

  // Helper function to apply delta updates to game state
  const applyUpdates = (game, updates) => {
    const newGame = _.cloneDeep(game);

    updates.forEach(update => {
      const { type, path, value } = update;
      const pathParts = path.split('.');

      if (type === 'set') {
        // Navigate to the parent object and set the value
        let current = newGame;
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          if (current[part] === undefined) {
            // Create intermediate objects if they don't exist
            current[part] = {};
          }
          current = current[part];
        }
        const lastPart = pathParts[pathParts.length - 1];
        current[lastPart] = value;
      } else if (type === 'unset') {
        // Navigate to the parent object and delete the key
        let current = newGame;
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          if (current[part] === undefined) {
            return; // Path doesn't exist, nothing to unset
          }
          current = current[part];
        }
        const lastPart = pathParts[pathParts.length - 1];
        delete current[lastPart];
      }
    });

    return newGame;
  };

  var handlePrompt = async (userInput, actionType = null, action = null) => {
    setIsProcessing(true);
    addToHistory({content: userInput, type: 'prompt'});

    try {game
      // Check if this can be handled client-side
      const extractedActionType = actionType || userInput.split(' ')[0];

      // Validate inventory for actions that have costs (Craft, Build, Plant, etc.)
      if (action && ['Craft', 'Build', 'Plant', 'Buy'].includes(extractedActionType)) {
        const validation = validateInventory(gameRef.current, extractedActionType, action);
        if (!validation.valid) {
          // Show error immediately without calling AI
          addToHistory({
            content: { error: true, message: validation.message },
            type: 'error'
          });
          setIsProcessing(false);
          return;
        }
      }

      let data;
      let clientSideData = null;

      if (canHandleClientSide(extractedActionType) && action) {
        // Handle client-side first for immediate feedback
        clientSideData = handleClientAction(gameRef.current, extractedActionType, action);
        console.log('Client-side action:', clientSideData);

        if (clientSideData.success) {
          // Apply client-side updates immediately
          let newGame = applyUpdates(gameRef.current, clientSideData.updates);

          // Check for newly completed quests
          const { updates: questUpdates, newlyCompleted } = updateCompletedQuests(newGame);
          if (questUpdates.length > 0) {
            // Apply quest completion updates
            newGame = applyUpdates(newGame, questUpdates);

            // Generate completion messages for all newly completed quests
            const completionMessages = newlyCompleted.map(quest => {
              let questDisplayText = quest.id;
              if (quest.conditions) {
                const condition = quest.conditions[0];
                const targetName = condition.item || condition.element;
                if (condition.quantity && condition.quantity > 1) {
                  questDisplayText = `${condition.action} ${condition.quantity} ${targetName}`;
                } else {
                  questDisplayText = `${condition.action} ${targetName}`;
                }
              }
              return `Quest complete: ${questDisplayText}`;
            }).join('\n');

            // Add quest completion to story text
            clientSideData.storyText = `${clientSideData.storyText}\n\n${completionMessages}`;
          }

          updateGame(newGame);

          // Add initial story text to history
          addToHistory({
            content: {
              storyText: clientSideData.storyText,
              updates: clientSideData.updates || []
            },
            type: 'response'
          });
        } else {
          // Show error message for failed client-side action
          addToHistory({
            content: { error: true, message: clientSideData.message },
            type: 'error'
          });
          setIsProcessing(false);
          return;
        }

        // // Still make API call to get quest updates and additional messages
        // const response = await fetch('/api/handle-prompt', {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify({ prompt: getPrompt(gameRef.current, historyRef.current, userInput) }),
        // });

        // data = await response.json();
        // if (!response.ok) {
        //   console.error('Error:', data.error);
        //   return;
        // }
      } else {
        // Use AI for complex actions
        const response = await fetch('/api/handle-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: getPrompt(gameRef.current, historyRef.current, userInput) }),
        });

        data = await response.json();
        if (!response.ok) {
          console.error('Error:', data.error);
          return;
        }
      }

      console.log(data);

      // Check for game over
      if (data && data.gameOverMessage) {
        setIsGameOver(true);
        setGameOverMessage(data.gameOverMessage);
      }

      // Check if action failed
      if (data && data.success === false) {
        // Show error message and redisplay previous state
        addToHistory({
          content: { error: true, message: data.message },
          type: 'error'
        });
      } else if (data) {
        // If we already handled client-side, only add additional story text and updates from AI
        if (clientSideData && clientSideData.success) {
          // Only add additional story text if AI provided something different
          // if (data.storyText && data.storyText !== clientSideData.storyText) {
          //   addToHistory({
          //     content: {
          //       storyText: data.storyText,
          //       updates: []
          //     },
          //     type: 'response'
          //   });
          // }

          // Apply any additional updates from AI (like quest progress)
          // if (data.updates && data.updates.length > 0) {
          //   const oldDay = gameRef.current.instance?.clock?.day;
          //   const newGame = applyUpdates(gameRef.current, data.updates);
          //   const newDay = newGame.instance?.clock?.day;

          //   // Update the game with additional updates
          //   updateGame(newGame);

          //   // If day changed, add checkpoint to history
          //   if (oldDay && newDay && newDay > oldDay) {
          //     addToHistory({
          //       type: 'checkpoint',
          //       content: {
          //         day: newDay,
          //         gameState: newGame,
          //         timestamp: new Date().toISOString()
          //       }
          //     });
          //   }
          // }
        } else {
          // Normal flow for non-client-side actions
          // Add story text and updates to history
          addToHistory({
            content: {
              storyText: data.storyText,
              updates: data.updates || []
            },
            type: 'response'
          });

          // Apply delta updates to game state
          if (data.updates && data.updates.length > 0) {
            const oldDay = gameRef.current.instance?.clock?.day;
            const newGame = applyUpdates(gameRef.current, data.updates);
            const newDay = newGame.instance?.clock?.day;

            // Update the game first
            updateGame(newGame);

            // If day changed, add checkpoint to history
            if (oldDay && newDay && newDay > oldDay) {
              addToHistory({
                type: 'checkpoint',
                content: {
                  day: newDay,
                  gameState: newGame,
                  timestamp: new Date().toISOString()
                }
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Request failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }

  // Event system handlers
  const handleTriggerEvent = async () => {
    const response = await fetch('/api/generate-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        game: gameRef.current,
        history: historyRef.current
      }),
    });

    const eventData = await response.json();

    if (!response.ok) {
      throw new Error(eventData.error || 'Failed to generate event');
    }

    setActiveEvent(eventData);
  };

  const handleEventComplete = (data) => {
    // Add event result to history
    addToHistory({
      content: {
        storyText: data.storyText,
        updates: data.updates || []
      },
      type: 'response'
    });

    // Apply updates if any
    if (data.updates && data.updates.length > 0) {
      const newGame = applyUpdates(gameRef.current, data.updates);
      updateGame(newGame);
    }
  };

  // Unified completion handler for Build/Craft/Upgrade actions
  const handleActionCompletion = ({ actionType, targetElement, instanceId, craftedItem }) => {
    const { activeLocation } = gameRef.current.instance;
    const updates = [];

    // Clear progress and activeAction if they exist (for minigame completion)
    if (instanceId) {
      updates.push({
        type: 'unset',
        path: `instance.locations.${activeLocation}.elementInstances.${instanceId}.progress`
      });
      updates.push({
        type: 'unset',
        path: `instance.locations.${activeLocation}.elementInstances.${instanceId}.activeAction`
      });
    }

    // Add crafted item to inventory
    if (actionType === 'Craft' && craftedItem) {
      const inventoryPath = gameRef.current.useLocationBasedInventory
        ? `instance.locations.${activeLocation}.inventory`
        : 'instance.inventory';

      const inventory = gameRef.current.useLocationBasedInventory
        ? gameRef.current.instance.locations[activeLocation]?.inventory || {}
        : gameRef.current.instance.inventory || {};
      console.log(' ----', inventoryPath, craftedItem, inventory);
      const currentAmount = inventory[craftedItem] || 0;
      updates.push({
        type: 'set',
        path: `${inventoryPath}.${craftedItem}`,
        value: currentAmount + 1
      });
    }

    // Apply updates
    let newGame = applyUpdates(gameRef.current, updates);

    // Check for newly completed quests
    const { updates: questUpdates, newlyCompleted } = updateCompletedQuests(newGame);
    let questCompletionText = '';

    if (questUpdates.length > 0) {
      newGame = applyUpdates(newGame, questUpdates);

      const completionMessages = newlyCompleted.map(quest => {
        let questDisplayText = quest.id;
        if (quest.conditions) {
          const condition = quest.conditions[0];
          const targetName = condition.item || condition.element;
          if (condition.quantity && condition.quantity > 1) {
            questDisplayText = `${condition.action} ${condition.quantity} ${targetName}`;
          } else {
            questDisplayText = `${condition.action} ${targetName}`;
          }
        }
        return `Quest complete: ${questDisplayText}`;
      }).join('\n');

      questCompletionText = `\n\n${completionMessages}`;
    }

    updateGame(newGame, { save: true });

    // Generate story text
    let storyText;
    if (actionType === 'Craft') {
      storyText = `You crafted ${craftedItem}.`;
    } else if (actionType === 'Upgrade') {
      storyText = `You upgraded the ${targetElement}.`;
    } else if (actionType === 'Build') {
      storyText = `You built a ${targetElement}.`;
    } else if (actionType === 'Plant') {
      storyText = `You plant ${targetElement}.`;
    } else {
      storyText = `You completed ${actionType}.`;
    }

    storyText = storyText + questCompletionText;

    const newHistoryItem = {
      content: {
        storyText,
        updates: []
      },
      type: 'response'
    };
    historyRef.current.push(newHistoryItem);
    localStorage.setItem(`game-history-${gameId}`, JSON.stringify(historyRef.current));
    forceUpdate();
  };

  const game = gameRef.current;
  const history = historyRef.current;

  if (!game) return null;

  // Calculate available actions based on current game state (grouped by type)
  const actionsByType = calculateAvailableActions(game);
  const nearestObject = findNearestObject(game);

  return (
    <div className={primaryFont.className} style={{
      minHeight: '100vh',
      backgroundColor: '#686152ff',
      color: '#171717',
    }}>
      <div className={styles.container}>
        <div className={styles.canvasWrapper}>
          {/* Map Component */}
          {game.instance && game.instance.locations && typeof(window) !== 'undefined' && (
            <>
              <MapSimple
                game={game}
                gameRef={gameRef}
                stageSize={{
                  width: window.innerWidth,
                  height: window.innerHeight
                }}
                onMessage={(message) => {
                  // Add attack messages to history
                  addToHistory({
                    type: 'response',
                    content: { storyText: message }
                  });

                  // Trigger red flash effect
                  setRedFlash(true);
                  setTimeout(() => setRedFlash(false), 200);
                }}
                onGameUpdate={() => {
                  // Check for game over after animal attacks
                  const gameOverStatus = checkGameOver(gameRef.current);
                  if (gameOverStatus.isGameOver) {
                    // Add game over message to history
                    addToHistory({
                      type: 'response',
                      content: { storyText: gameOverStatus.reason }
                    });
                    // Set game over flag
                    gameRef.current.instance.isGameOver = true;
                    setIsGameOver(true);
                    forceUpdate();
                  }
                }}
                onPositionUpdate={(newPosition) => {
                  // Update character position in game state
                  const characterName = gameRef.current.instance.activeCharacter;

                  const updates = [
                    { type: 'set', path: `instance.characters.${characterName}.x`, value: newPosition.x },
                    { type: 'set', path: `instance.characters.${characterName}.y`, value: newPosition.y }
                  ];

                  const newGame = applyUpdates(gameRef.current, updates);
                  // Use debounced save for movement to avoid excessive localStorage writes
                  updateGameWithDebounce(newGame);
                }}
              />
              {/* <FilmNoise opacity={0.2} intensity={0.2} /> */}
              {/* Red flash overlay when attacked */}
              {redFlash && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 0, 0, 0.3)',
                  pointerEvents: 'none',
                  zIndex: 9999
                }} />
              )}
              <HUD
                game={game}
                gameRef={gameRef}
                gameId={gameId}
                history={history}
                actionsByType={actionsByType}
                isProcessing={isProcessing}
                isGameOver={isGameOver}
                selectedActionType={selectedActionType}
                setSelectedActionType={setSelectedActionType}
                nearestObject={nearestObject}
                onTriggerEvent={handleTriggerEvent}
                onMinigameEvent={(event) => {
                  const { energyCost, progress } = event;
                  const characterName = gameRef.current.instance.activeCharacter;
                  const currentEnergy = gameRef.current.instance.characters?.[characterName]?.stats?.Energy || 0;
                  const newEnergy = Math.max(0, currentEnergy - energyCost);

                  const updates = [{
                    type: 'set',
                    path: `instance.characters.${characterName}.stats.Energy`,
                    value: newEnergy
                  }];

                  const currentNearestObject = findNearestObject(gameRef.current);
                  if (currentNearestObject?.instanceId) {
                    const { activeLocation } = gameRef.current.instance;
                    updates.push({
                      type: 'set',
                      path: `instance.locations.${activeLocation}.elementInstances.${currentNearestObject.instanceId}.progress`,
                      value: progress
                    });
                  }

                  const newGame = applyUpdates(gameRef.current, updates);
                  updateGame(newGame, { save: false });
                }}
                onMinigameComplete={(result) => {
                  const currentNearestObject = findNearestObject(gameRef.current);
                  if (currentNearestObject?.instanceId && currentNearestObject?.instance?.activeAction) {
                    const activeAction = currentNearestObject.instance.activeAction;

                    // Wait 1 second before completing
                    setTimeout(() => {
                      handleActionCompletion({
                        actionType: activeAction.actionType,
                        targetElement: currentNearestObject.instance.element,
                        instanceId: currentNearestObject.instanceId,
                        craftedItem: activeAction.craftedItem
                      });
                    }, 1000);
                  }
                }}
                onClearMessage={(index) => {
                  // Mark the history item as cleared
                  if (historyRef.current[index]) {
                    _.forEach (historyRef.current, (historyItem) => historyItem.cleared = true);

                    // Save to localStorage
                    localStorage.setItem(`game-history-${gameId}`, JSON.stringify(historyRef.current));
                    forceUpdate();
                  }
                }}
                onActionClick={(actionType, isSingleOption, action) => {
                  // Handle actions with requiredScore (Build, Upgrade, Craft)
                  if (action?.actionData?.requiredScore) {
                    const actionData = action.actionData || {};
                    const requiredScore = actionData.requiredScore;

                    // Check if minigames are enabled (defaults to false/disabled)
                    const enableMinigames = typeof window !== 'undefined' && localStorage.getItem('enable-minigames') === 'true';
                    const disableMinigames = !enableMinigames;

                    // Determine which client action handler to use
                    const handlerActionType = (actionType === 'Build' || actionType === 'Upgrade') ? 'Build' : actionType;

                    const result = handleClientAction(gameRef.current, handlerActionType, {
                      targetElement: action.targetElement,
                      targetInstanceId: action.targetInstanceId
                    });

                    if (!result?.success) {
                      const newHistoryItem = {
                        type: 'error',
                        content: {message: result?.message || `Cannot ${actionType.toLowerCase()}`},
                        cleared: false,
                        timestamp: Date.now()
                      };
                      historyRef.current.push(newHistoryItem);
                      localStorage.setItem(`game-history-${gameId}`, JSON.stringify(historyRef.current));
                      forceUpdate();
                      return;
                    }

                    // Determine which instance to attach action to
                    let instanceId;
                    if (actionType === 'Build' || actionType === 'Upgrade') {
                      // For Build/Upgrade, use the building being built/upgraded
                      instanceId = result.instanceId || action.targetInstanceId;
                    } else {
                      // For Craft and other actions, use nearest object (the building)
                      const nearestObject = findNearestObject(gameRef.current);
                      instanceId = nearestObject?.instanceId;
                    }

                    const { activeLocation } = gameRef.current.instance;

                    // Determine minigame type based on action
                    let minigameType = 'accuracy'; // Default for Build/Upgrade
                    if (actionType === 'Craft') {
                      minigameType = 'timing';
                    } else if (actionType === 'Attack') {
                      minigameType = 'accuracy';
                    }

                    if (!disableMinigames) {
                      // Start minigame normally
                      const activeActionValue = {
                        actionType,
                        requiredScore,
                        minigameType,
                        ...(actionType === 'Craft' && { craftedItem: action.targetElement })
                      };

                      result.updates.push({
                        type: 'set',
                        path: `instance.locations.${activeLocation}.elementInstances.${instanceId}.activeAction`,
                        value: activeActionValue
                      });

                      const newGame = applyUpdates(gameRef.current, result.updates);
                      updateGame(newGame, { save: true });
                    } else {
                      // Complete immediately if minigames are disabled
                      // Apply the building/item creation updates first
                      const newGame = applyUpdates(gameRef.current, result.updates);
                      updateGame(newGame, { save: false });

                      // Then complete the action using unified handler
                      handleActionCompletion({
                        actionType,
                        targetElement: action.targetElement,
                        instanceId: instanceId,
                        craftedItem: action.targetElement
                      });
                    }

                    setSelectedActionType(null);
                    return;
                  }

                  // Handle Plant action client-side (similar to Build)
                  if (actionType === 'Plant' && action && action.targetElement) {
                    const result = handleClientAction(gameRef.current, 'Plant', action);

                    if (!result?.success) {
                      const newHistoryItem = {
                        content: { error: true, message: result?.message || 'Cannot plant' },
                        type: 'error'
                      };
                      historyRef.current.push(newHistoryItem);
                      localStorage.setItem(`game-history-${gameId}`, JSON.stringify(historyRef.current));
                      forceUpdate();
                      setSelectedActionType(null);
                      return;
                    }

                    // Apply the plant creation updates first
                    const newGame = applyUpdates(gameRef.current, result.updates);
                    updateGame(newGame, { save: false });

                    // Complete the Plant action using unified handler (includes quest checking)
                    handleActionCompletion({
                      actionType: 'Plant',
                      targetElement: action.targetElement,
                      instanceId: null,
                      craftedItem: null
                    });

                    setSelectedActionType(null);
                    return;
                  }

                  // Handle weapon attack actions client-side
                  if (action?.isAttackAction) {
                    const result = handleClientAction(gameRef.current, 'Attack', action);

                    if (!result?.success) {
                      const newHistoryItem = {
                        content: { error: true, message: result?.message || 'Cannot attack' },
                        type: 'error'
                      };
                      historyRef.current.push(newHistoryItem);
                      localStorage.setItem(`game-history-${gameId}`, JSON.stringify(historyRef.current));
                      forceUpdate();
                      setSelectedActionType(null);
                      return;
                    }

                    // Apply the attack updates
                    let newGame = applyUpdates(gameRef.current, result.updates);

                    // Check for newly completed quests
                    const { updates: questUpdates, newlyCompleted } = updateCompletedQuests(newGame);
                    let storyText = result.storyText;

                    if (questUpdates.length > 0) {
                      newGame = applyUpdates(newGame, questUpdates);

                      const completionMessages = newlyCompleted.map(quest => {
                        let questDisplayText = quest.id;
                        if (quest.conditions) {
                          const condition = quest.conditions[0];
                          const targetName = condition.item || condition.element;
                          if (condition.quantity && condition.quantity > 1) {
                            questDisplayText = `${condition.action} ${condition.quantity} ${targetName}`;
                          } else {
                            questDisplayText = `${condition.action} ${targetName}`;
                          }
                        }
                        return `Quest complete: ${questDisplayText}`;
                      }).join('\n');

                      storyText = `${storyText}\n\n${completionMessages}`;
                    }

                    updateGame(newGame, { save: true });

                    const newHistoryItem = {
                      content: {
                        storyText: storyText,
                        updates: []
                      },
                      type: 'response'
                    };
                    historyRef.current.push(newHistoryItem);
                    localStorage.setItem(`game-history-${gameId}`, JSON.stringify(historyRef.current));
                    forceUpdate();

                    setSelectedActionType(null);
                    return;
                  }

                  if (isSingleOption) {
                    // If only one option, execute it directly
                    let prompt = '';
                    if (action.targetInstanceId) {
                      prompt = `${actionType} ${action.targetElement} (Instance ${action.targetInstanceId})`;
                    } else {
                      prompt = `${actionType} ${action.targetElement}`;
                    }

                    handlePrompt(prompt, actionType, action);
                  } else {
                    // Multiple options or submenu item
                    if (selectedActionType === actionType && (!action || !action.targetElement)) {
                      // Clicking the same action type - toggle off
                      setSelectedActionType(null);
                    } else if (action && action.targetElement) {
                      // Submenu item clicked
                      let prompt = '';

                      if (action.targetInstanceId) {
                        prompt = `${actionType} ${action.targetElement} (Instance ${action.targetInstanceId})`;
                      } else {
                        prompt = `${actionType} ${action.targetElement}`;
                      }

                      handlePrompt(prompt, actionType, action);
                      setSelectedActionType(null);
                    } else {
                      // Show submenu
                      setSelectedActionType(actionType);
                    }
                  }
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Game Over Screen */}
      {isGameOver && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h1 style={{ color: '#c33', marginBottom: '20px' }}>Game Over</h1>
            <p style={{ fontSize: '18px', marginBottom: '30px', whiteSpace: 'pre-wrap' }}>
              {gameOverMessage}
            </p>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
              <strong>Final Stats:</strong>
              <div style={{ marginTop: '10px', textAlign: 'left' }}>
                {game.clock && <div>Day: {game.clock.day}</div>}
                {game.money !== undefined && <div>Money: <Currency amount={game.money} /></div>}
                {game.currentLocation && <div>Location: {game.currentLocation}</div>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Button
                onClick={() => {
                  // Find most recent checkpoint
                  const lastCheckpoint = [...history].reverse().find(h => h.type === 'checkpoint');
                  if (lastCheckpoint) {
                    updateGame(lastCheckpoint.content.gameState);
                    updateHistory(history.slice(0, history.lastIndexOf(lastCheckpoint) + 1));
                    setIsGameOver(false);
                    setGameOverMessage('');
                  } else {
                    alert('No checkpoints available');
                  }
                }}
                style={{ backgroundColor: '#ffa500', color: 'white', flex: 1 }}
              >
                Load Last Checkpoint
              </Button>
              <Button
                onClick={resetGame}
                variant="outline"
                style={{ borderColor: '#c33', color: '#c33', flex: 1 }}
              >
                Reset Game
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {activeEvent && (
        <EventModal
          event={activeEvent}
          game={game}
          history={history}
          onClose={() => setActiveEvent(null)}
          onEventComplete={handleEventComplete}
        />
      )}

      {/* Loading overlay that fades out */}
      {showOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(68, 64, 61, 1)',
          opacity: overlayOpacity,
          transition: 'opacity 300ms ease-out',
          pointerEvents: 'none',
          zIndex: 10000
        }} />
      )}
    </div>
  );
}
