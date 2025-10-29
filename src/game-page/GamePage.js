import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import _ from 'lodash';
import dynamic from 'next/dynamic';
import { Button } from './Button';
import { Currency } from './Currency';
import { ActionSelector } from './ActionSelector';
import { HistoryItem } from './HistoryItem';
import HUD from './HUD';
import { getPrompt } from './getPrompt';
import { formatTime, calculateAvailableActions } from './helpers';
import { getActionColor } from './actionColors';
import { handleClientAction, canHandleClientSide, validateInventory, calculateTimeUpdate, applyEnergyDepletion, checkGameOver } from './clientActions';
import { updateActiveQuest } from './questTracking';
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

          // Check if quest is complete after applying updates
          const questUpdate = updateActiveQuest(newGame);
          if (questUpdate) {
            // Get current quest info for completion message
            const currentQuestId = newGame.instance.activeQuest;
            const quests = newGame.quests || [];
            const currentQuest = quests.find(q => {
              const id = typeof q === 'string' ? q : q.id;
              return id === currentQuestId;
            });

            // Generate quest completion message
            let questDisplayText = currentQuestId;
            if (currentQuest && typeof currentQuest === 'object' && currentQuest.conditions) {
              const condition = currentQuest.conditions[0];
              const targetName = condition.item || condition.element;
              if (condition.quantity && condition.quantity > 1) {
                questDisplayText = `${condition.action} ${condition.quantity} ${targetName}`;
              } else {
                questDisplayText = `${condition.action} ${targetName}`;
              }
            }

            // Apply quest update
            newGame = applyUpdates(newGame, [questUpdate]);

            // Add quest completion to story text
            clientSideData.storyText = `${clientSideData.storyText}\n\nQuest complete: ${questDisplayText}`;
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

  const game = gameRef.current;
  const history = historyRef.current;

  if (!game) return null;

  // Calculate available actions based on current game state (grouped by type)
  const actionsByType = calculateAvailableActions(game);

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
                onPositionUpdate={(newPosition, options = {}) => {
                  // Update character position in game state
                  const characterName = gameRef.current.instance.activeCharacter;

                  const updates = [
                    { type: 'set', path: `instance.characters.${characterName}.x`, value: newPosition.x },
                    { type: 'set', path: `instance.characters.${characterName}.y`, value: newPosition.y }
                  ];

                  // Add time progression if crossing cell boundaries (1 minute per cell)
                  if (options.timeProgression) {
                    const hoursElapsed = 1 / 60; // 1 minute
                    const timeUpdate = calculateTimeUpdate(gameRef.current.instance.clock, hoursElapsed);
                    if (timeUpdate) {
                      updates.push(timeUpdate);
                    }
                    // Apply energy depletion (1 per hour)
                    const energyDepletionUpdates = applyEnergyDepletion(gameRef.current, hoursElapsed, characterName, false);
                    updates.push(...energyDepletionUpdates);
                  }

                  const newGame = applyUpdates(gameRef.current, updates);
                  // Use debounced save for movement to avoid excessive localStorage writes
                  updateGameWithDebounce(newGame);
                }}
              />
              <FilmNoise opacity={0.2} intensity={0.2} />
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
                history={history}
                actionsByType={actionsByType}
                isProcessing={isProcessing}
                isGameOver={isGameOver}
                selectedActionType={selectedActionType}
                setSelectedActionType={setSelectedActionType}
                onClearMessage={(index) => {
                  // Mark the history item as cleared
                  if (historyRef.current[index]) {
                    historyRef.current[index].cleared = true;
                    // Save to localStorage
                    localStorage.setItem(`game-history-${gameId}`, JSON.stringify(historyRef.current));
                    forceUpdate();
                  }
                }}
                onActionClick={(actionType, isSingleOption, action) => {
                  if (isSingleOption) {
                    // If only one option, execute it directly
                    let prompt = '';
                    if (action.targetInstanceId) {
                      prompt = `${actionType} ${action.targetElement} (Instance ${action.targetInstanceId})`;
                    } else {
                      prompt = `${actionType} ${action.targetElement}`;
                    }

                    // For Build and Plant actions, append player position
                    if (actionType === 'Build' || actionType === 'Plant') {
                      const characterName = gameRef.current.instance.activeCharacter;
                      const characterData = gameRef.current.instance.characters[characterName];
                      if (characterData) {
                        const x = Math.round(characterData.x);
                        const y = Math.round(characterData.y);
                        prompt += ` at position (${x}, ${y})`;
                      }
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
                      const isUpgrade = action.isUpgrade;

                      // For upgrades, use the existing instance ID
                      if (isUpgrade && action.existingInstanceId) {
                        prompt = `${actionType} ${action.targetElement} (Instance ${action.existingInstanceId})`;
                      } else if (action.targetInstanceId) {
                        prompt = `${actionType} ${action.targetElement} (Instance ${action.targetInstanceId})`;
                      } else {
                        prompt = `${actionType} ${action.targetElement}`;
                      }

                      // For Build and Plant actions, append player position (only if new build, not upgrade)
                      if ((actionType === 'Build' && !isUpgrade) || actionType === 'Plant') {
                        const characterName = gameRef.current.instance.activeCharacter;
                        const characterData = gameRef.current.instance.characters[characterName];
                        if (characterData) {
                          const x = Math.round(characterData.x);
                          const y = Math.round(characterData.y);
                          prompt += ` at position (${x}, ${y})`;
                        }
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

        <div className={styles.storyWrapper}>
          {/* <h1 style={{ color: '#fff', marginBottom: 5, fontSize: '1.5rem', fontWeight: 'normal'}}>
            {game.title}
          </h1> */}
          <div style={{fontSize: '1em', marginBottom: 20}}>
            {game.money !== undefined && (
              <div style={{marginBottom: 8}}><b><Currency amount={game.money} /></b></div>
            )}

            {game.weather && (
              <p style={{opacity: 0.7}}>{game.weather.condition} {game.weather.high && `(${game.weather.low}°F - ${game.weather.high}°F)`}</p>
            )}
          </div>

          {/* Action buttons moved to HUD - keep this comment for reference */}
          {false && !isProcessing && !isGameOver && Object.keys(actionsByType).length > 0 && (
            <div style={{ marginTop: 30, marginBottom: '20px' }}>
              {/* Show action type buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 15 }}>
                {Object.keys(actionsByType).map((actionType) => {
                  const actions = actionsByType[actionType];
                  const isSingleOption = actions.length === 1;
                  const singleAction = isSingleOption ? actions[0] : null;
                  const actionColor = getActionColor(actionType);

                  return (
                    <Button
                      key={actionType}
                      active={selectedActionType === actionType}
                      onClick={() => {
                        if (isSingleOption) {
                          // If only one option, execute it directly
                          let prompt = '';
                          if (singleAction.targetInstanceId) {
                            prompt = `${actionType} ${singleAction.targetElement} (Instance ${singleAction.targetInstanceId})`;
                          } else {
                            prompt = `${actionType} ${singleAction.targetElement}`;
                          }

                          // For Build and Plant actions, append player position
                          if (actionType === 'Build' || actionType === 'Plant') {
                            const characterName = gameRef.current.instance.activeCharacter;
                            const characterData = gameRef.current.instance.characters[characterName];
                            if (characterData) {
                              const x = Math.round(characterData.x);
                              const y = Math.round(characterData.y);
                              prompt += ` at position (${x}, ${y})`;
                            }
                          }

                          handlePrompt(prompt, actionType, singleAction);
                        } else {
                          // Multiple options, show submenu
                          setSelectedActionType(selectedActionType === actionType ? null : actionType);
                        }
                      }}
                      style={{
                        position: 'relative',
                      }}
                    >
                      {isSingleOption
                        ? `${singleAction.isUpgrade ? 'Upgrade' : actionType} ${singleAction.targetElement}`
                        : actionType}
                      {!isSingleOption && (
                        <span style={{
                          fontSize: '9px',
                          position: 'absolute',
                          bottom: '2px',
                          right: '4px',
                          fontWeight: 'bold',
                          opacity: 0.7,
                          pointerEvents: 'none'
                        }}>
                          {actions.length}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>

              {/* Show submenu for selected action type (only if multiple options) */}
              {selectedActionType && actionsByType[selectedActionType] && actionsByType[selectedActionType].length > 1 && (
                <div style={{ marginTop: 10}}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {actionsByType[selectedActionType].map((action, index) => {
                      const isUpgrade = action.isUpgrade;
                      const displayLabel = isUpgrade ? `Upgrade ${action.targetElement}` : action.targetElement;

                      // Get element color
                      const elementDef = game.elements?.[action.targetCollection]?.[action.targetElement];
                      const elementColor = elementDef?.color || '#676767ff';

                      return (
                        <Button
                          key={`${selectedActionType}-${index}`}
                          theme='secondary'
                          style={{
                            backgroundColor: elementColor,
                            color: 'white'
                          }}
                          onClick={() => {
                            let prompt = '';

                            // For upgrades, use the existing instance ID
                            if (isUpgrade && action.existingInstanceId) {
                              prompt = `${selectedActionType} ${action.targetElement} (Instance ${action.existingInstanceId})`;
                            } else if (action.targetInstanceId) {
                              prompt = `${selectedActionType} ${action.targetElement} (Instance ${action.targetInstanceId})`;
                            } else {
                              prompt = `${selectedActionType} ${action.targetElement}`;
                            }

                            // For Build and Plant actions, append player position (only if new build, not upgrade)
                            if ((selectedActionType === 'Build' && !isUpgrade) || selectedActionType === 'Plant') {
                              const characterName = gameRef.current.instance.activeCharacter;
                              const characterData = gameRef.current.instance.characters[characterName];
                              if (characterData) {
                                const x = Math.round(characterData.x);
                                const y = Math.round(characterData.y);
                                prompt += ` at position (${x}, ${y})`;
                              }
                            }

                            handlePrompt(prompt, selectedActionType, action);
                            setSelectedActionType(null);
                          }}
                        >
                          {displayLabel}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {isProcessing && (
            <div style={{ marginBottom: '20px', color: '#666' }}>
              Loading...
            </div>
          )}
          {/* Story History - Reversed so most recent is at top */}
          <div style={{ marginBottom: '20px', borderRadius: '5px' }}>
            {[...history].reverse().map((historyItem, reverseIndex) => {
              const index = history.length - 1 - reverseIndex; // Original index for checkpoint loading
              return (
                <div key={index} style={{ marginTop: '10px' }}>
                  <HistoryItem
                    historyItem={historyItem}
                    onLoadCheckpoint={() => {
                      if (confirm(`Load checkpoint from Day ${historyItem.content.day}? Current progress will be lost.`)) {
                        updateGame(historyItem.content.gameState);
                        updateHistory(history.slice(0, index + 1));
                        setIsGameOver(false);
                        setGameOverMessage('');
                      }
                    }}
                  />
                </div>
              );
            })}
            {game.instance.storyText && (
              <p style={{ whiteSpace: 'pre-line' }}>{game.instance.storyText}</p>
            )}
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
        </div>
      </div>

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
