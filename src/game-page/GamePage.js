import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import _ from 'lodash';
import dynamic from 'next/dynamic';
import { Button } from './Button';
import { Currency } from './Currency';
import { ActionSelector } from './ActionSelector';
import { HistoryItem } from './HistoryItem';
import { getPrompt } from './getPrompt';
import { formatTime, calculateAvailableActions } from './helpers';
import { getActionColor } from './actionColors';
import { handleClientAction, canHandleClientSide, validateInventory, calculateTimeUpdate } from './clientActions';
import { primaryFont } from '../styles/fonts';
import styles from './GamePage.module.css';
import { Tooltip } from 'react-tooltip';

const MapSimple = dynamic(() => import('../components/MapSimple'), { ssr: false });
const FilmNoise = dynamic(() => import('../components/FilmNoise'), { ssr: false });

export default function GamePage() {
  const router = useRouter();
  const { gameId } = router.query;

  // Force update mechanism
  const [, setUpdateTrigger] = useState(0);
  const forceUpdate = () => setUpdateTrigger(prev => prev + 1);

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

  // Methods to update refs
  const updateGame = (newGame, {save=true}={}) => {
    gameRef.current = newGame;
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

    try {
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
          const newGame = applyUpdates(gameRef.current, clientSideData.updates);
          updateGame(newGame);

          // Add initial story text to history
          addToHistory({
            content: {
              storyText: clientSideData.storyText,
              updates: clientSideData.updates || []
            },
            type: 'response'
          });
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
      backgroundColor: '#303030ff',
      color: '#171717',
    }}>
      <div>
        <div className={styles.storyWrapper}>
          <div style={{fontSize: '1em', marginBottom: 20, fontSize: '1.1rem', top: 60, right: 40}}>
            <div>
              {game.instance?.clock && (
                <span>Day {game.instance.clock.day}, {formatTime(game.instance.clock.time)}</span>
              )}
              <span>, the {game.instance?.activeLocation}</span>
              {game.money !== undefined && (
                <div style={{marginTop: 3}}><b><Currency amount={game.money} /></b></div>
              )}
            </div>

            {game.weather && (
              <p>{game.weather.condition} {game.weather.high && `(${game.weather.low}°F - ${game.weather.high}°F)`}</p>
            )}

            {/* Active Quest Display */}
            {game.instance?.activeQuest && (
              <div style={{
                marginTop: 12,
                fontSize: '0.9em',
                opacity: 1,
                color: '#ffffff',
              }}>
                <div style={{marginBottom: 4, }}>
                  {game.instance.activeQuest}
                </div>
              </div>
            )}
          </div>

          {/* Inventory Display */}
          {game.instance?.locations?.[game.instance.activeLocation]?.inventory &&
           Object.keys(game.instance.locations[game.instance.activeLocation].inventory).length > 0 && (
            <div style={{position: 'fixed', top: 40, right: 40, zIndex: 100, display: 'flex', gap: '2px', flexWrap: 'wrap', marginBottom: 1}}>
              {Object.entries(game.instance.locations[game.instance.activeLocation].inventory)
                .filter(([, qty]) => qty > 0)
                .map(([itemName, qty]) => {
                  const itemDef = game.elements?.Items?.[itemName];
                  const itemColor = itemDef?.color || 'rgba(0, 0, 0, 0.3)';

                  return (
                    <div
                      key={itemName}
                      style={{
                        position: 'relative',
                        padding: '0 16px',
                        height: '36px',
                        width: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        cursor: 'default',
                      }}
                      data-tooltip-id={`inventory-tooltip-${itemName}`}
                      data-tooltip-content={itemName.toUpperCase()}
                    >
                      {/* Background color layer */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#555555ff',
                        backgroundColor: itemColor,
                        // opacity: 0.5,
                        pointerEvents: 'none'
                      }} />

                      {/* Content layer */}
                      <span style={{ color: 'white', position: 'relative', zIndex: 1 }}>
                        {itemName.charAt(0).toUpperCase()}
                      </span>
                      <span style={{
                        fontSize: '9px',
                        position: 'absolute',
                        bottom: '2px',
                        right: '5px',
                        color: 'white',
                        zIndex: 1
                      }}>
                        {qty}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Available Actions - Grouped by Type */}
          {!isProcessing && !isGameOver && Object.keys(actionsByType).length > 0 && (
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
                            const locationName = gameRef.current.instance.activeLocation;
                            const characterName = gameRef.current.instance.activeCharacter;
                            const characterData = gameRef.current.instance.locations[locationName]?.characters[characterName];
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
                              const locationName = gameRef.current.instance.activeLocation;
                              const characterName = gameRef.current.instance.activeCharacter;
                              const characterData = gameRef.current.instance.locations[locationName]?.characters[characterName];
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
        <div className={styles.canvasWrapper}>
          {/* Map Component */}
          {game.instance && game.instance.locations && (
            <>
              <MapSimple
                activeLocation={game.instance.locations[game.instance.activeLocation]}
                activeCharacter={game.instance.activeCharacter}
                gameElements={game.elements}
                stageSize={{
                  width: typeof(window) !== 'undefined' ? (window.innerWidth <= 768 ? window.innerWidth : window.innerWidth / 2) : 600,
                  height: typeof(window) !== 'undefined' ? (window.innerWidth <= 768 ? window.innerHeight / 2 : window.innerHeight) : 600
                }}
                onPositionUpdate={(newPosition, options = {}) => {
                  // Update character position in game state
                  const locationName = gameRef.current.instance.activeLocation;
                  const characterName = gameRef.current.instance.activeCharacter;

                  const updates = [
                    { type: 'set', path: `instance.locations.${locationName}.characters.${characterName}.x`, value: newPosition.x },
                    { type: 'set', path: `instance.locations.${locationName}.characters.${characterName}.y`, value: newPosition.y }
                  ];

                  // Add time progression if crossing cell boundaries (1 minute per cell)
                  if (options.timeProgression) {
                    const timeUpdate = calculateTimeUpdate(gameRef.current.instance.clock, 1 / 60); // 1 minute
                    if (timeUpdate) {
                      updates.push(timeUpdate);
                    }
                  }

                  const newGame = applyUpdates(gameRef.current, updates);

                  // Use debounced save for movement to avoid excessive localStorage writes
                  updateGameWithDebounce(newGame);
                }}
              />
              <FilmNoise opacity={0.2} intensity={0.2} />
            </>
          )}
        </div>

        {/* Inventory Tooltips */}
        {game.instance?.locations?.[game.instance.activeLocation]?.inventory &&
          Object.entries(game.instance.locations[game.instance.activeLocation].inventory)
            .filter(([, qty]) => qty > 0)
            .map(([itemName]) => (
              <Tooltip
                key={`inventory-tooltip-${itemName}`}
                id={`inventory-tooltip-${itemName}`}
                place="right"
                style={{
                  borderRadius: '0px',
                  textTransform: 'uppercase',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  zIndex: 1000
                }}
              />
            ))
        }
      </div>
    </div>
  );
}
