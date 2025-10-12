import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { EB_Garamond } from 'next/font/google';
import _ from 'lodash';
import dynamic from 'next/dynamic';
import { Button } from './Button';
import { Currency } from './Currency';
import { ActionSelector } from './ActionSelector';
import { HistoryItem } from './HistoryItem';
import { getPrompt } from './getPrompt';
import { formatTime } from './helpers';

const PlatformerCanvas = dynamic(() => import('../components/platformer/PlatformerCanvas'), { ssr: false });

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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
  const updateGame = (newGame) => {
    gameRef.current = newGame;
    if (typeof window !== 'undefined' && gameId) {
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

  const addToHistory = (historyItem) => {
    updateHistory([...historyRef.current, historyItem]);
  };

  var [isProcessing, setIsProcessing] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState('');

  const resetGame = () => {
    if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
      if (initialGameRef.current) {
        updateGame(JSON.parse(JSON.stringify(initialGameRef.current)));
        updateHistory([]);
      }
    }
  };

  var handlePrompt = async (userInput) => {
    setIsProcessing(true);
    addToHistory({content: userInput, type: 'prompt'});

    try {
      const response = await fetch('/api/handle-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: getPrompt(gameRef.current, historyRef.current, userInput) }),
      });

      var data = await response.json();
      if (response.ok) {
        console.log(data);

        // Check for game over
        if (data.gameOverMessage) {
          setIsGameOver(true);
          setGameOverMessage(data.gameOverMessage);
        }

        // Check if action failed
        if (data.success === false) {
          // Show error message and redisplay previous state
          addToHistory({
            content: { error: true, message: data.message },
            type: 'error'
          });
        } else {
          // Add full API response to history
          addToHistory({
            content: data,
            type: 'response'
          });

          // Check if day changed - create checkpoint
          const dayChanged = data.updatedClock && gameRef.current.clock && data.updatedClock.day > gameRef.current.clock.day;

          // Update game state
          const newGame = { ...gameRef.current };

          // Update clock
          if (data.updatedClock) {
            newGame.clock = data.updatedClock;
          }

          // Update money
          if (data.updatedMoney !== undefined) {
            newGame.money = data.updatedMoney;
          }

          // Update inventory (apply differentials to items)
          if (data.inventoryUpdates) {
            const updatedItems = { ...newGame.items };
            Object.entries(data.inventoryUpdates).forEach(([itemName, change]) => {
              if (updatedItems[itemName]) {
                updatedItems[itemName] = {
                  ...updatedItems[itemName],
                  inventory: (updatedItems[itemName].inventory || 0) + change
                };
              }
            });
            newGame.items = updatedItems;
          }

          // Update available actions
          if (data.nextAvailableActions) {
            newGame.availableActions = data.nextAvailableActions;
          }

          // Update the game first
          updateGame(newGame);

          // If day changed, add checkpoint to history
          if (dayChanged) {
            addToHistory({
              type: 'checkpoint',
              content: {
                day: data.updatedClock.day,
                gameState: newGame,
                timestamp: new Date().toISOString()
              }
            });
          }
        }
      } else {
        console.error('Error:', data.error);
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

  return (
    <div className={ebGaramond.className} style={{
      minHeight: '100vh',
      backgroundColor: '#EFECE3',
      color: '#171717',
    }}>
      <div style={{}}>
        <div style={{padding: '40px 40px', paddingRight: 580}}>
          <h1 style={{ fontSize: '36px', fontWeight: 600, marginBottom: 40 }}>{game.title}</h1>

          {/* Story History */}
          <div style={{ marginBottom: '20px', borderRadius: '5px' }}>
            {game.story && (
              <p style={{ whiteSpace: 'pre-line' }}>{game.story}</p>
            )}
            {history.map((historyItem, index) => (
              <div key={index} style={{ marginTop: '10px' }}>
                <HistoryItem
                  historyItem={historyItem}
                  game={game}
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
            ))}
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
                padding: '40px',
                borderRadius: '8px',
                maxWidth: '500px',
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

          {/* Available Actions */}
          {!isProcessing && !isGameOver && game.availableActions && game.availableActions.length > 0 && (
            <ActionSelector
              actions={game.availableActions}
              onSelectAction={(type, label, option) => {
                // Handle Pass Time action (label is minutes)
                if (type === 'Pass Time' && typeof label === 'number') {
                  handlePrompt(`${type}: ${label} minutes`);
                }
                // Handle Buy/Craft/Plant actions with quantities (label is array of items)
                else if (_.includes(['Buy', 'Craft', 'Plant'], type) && Array.isArray(label)) {
                  const itemList = label.map(item => `${item.quantity}x ${item.label}`).join(', ');
                  handlePrompt(`${type}: ${itemList}`);
                }
                // Handle nested options
                else if (option && option.label) {
                  handlePrompt(`${type}: ${option.label}`);
                }
                // Handle single option
                else if (label) {
                  handlePrompt(`${type}: ${label}`);
                }
                // Handle action with no options
                else {
                  handlePrompt(`${type}`);
                }
              }}
            />
          )}

          {isProcessing && (
            <div style={{ marginBottom: '20px', color: '#666' }}>
              Loading...
            </div>
          )}
        </div>
        <div style={{width: 500, position: 'absolute', top: 40, right: 40}}>
          <PlatformerCanvas width={500} height={500} />
{/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Button
              onClick={resetGame}
              variant="outline"
              style={{ backgroundColor: '#fee', color: '#c33' }}
            >
              Reset Game
            </Button>
          </div> */}

          {/* Game State */}
          <div style={{ margin: '20px', borderRadius: '5px', fontSize: '1em' }}>
            <div>
              {game.clock && (
                <span>Day {game.clock.day}, {formatTime(game.clock.time)}</span>
              )}
              <span> at the {game.currentLocation}</span>
            </div>
            {game.money !== undefined && (
              <p style={{marginTop: 10}}><b><Currency amount={game.money} /></b></p>
            )}
            {game.weather && (
              <p>{game.weather.condition} {game.weather.high && `(${game.weather.low}°F - ${game.weather.high}°F)`}</p>
            )}
            <div style={{marginTop: 10}}>
              {game.items && Object.entries(game.items)
                .filter(([_, item]) => item.inventory && item.inventory > 0)
                .map(([itemName, item]) => (
                  <div key={itemName}>
                    <b>{item.inventory}</b> {itemName}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
