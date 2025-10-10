import { useState, useRef, useEffect } from 'react';
import { allGames } from '../games/exampleGames';
import _ from 'lodash';

// Currency Component
function Currency({ amount }) {
  return (
    <span>
      {formatCurrency(amount)}
    </span>
  );
}

var formatCurrency = (amount => {
  const isNegative = amount < 0;
  const formattedAmount = Math.abs(amount).toLocaleString();

  return `${isNegative ? '-' : ''}$${formattedAmount}`;
});

// Button Component
function Button({ children, onClick, variant = 'filled', disabled = false, style = {} }) {
  const baseStyle = {
    height: '40px',
    padding: '0 16px',
    border: variant === 'outline' ? '1px solid #666' : 'none',
    backgroundColor: variant === 'outline' ? 'transparent' : (disabled ? '#ccc' : '#e0e0e0'),
    color: disabled ? '#999' : '#333',
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'monospace',
    fontWeight: '500',
    transition: 'all 0.2s',
    ...style
  };

  const hoverStyle = !disabled ? {
    backgroundColor: variant === 'outline' ? '#f5f5f5' : '#d0d0d0'
  } : {};

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (!disabled) {
          Object.assign(e.target.style, hoverStyle);
        }
      }}
      onMouseLeave={(e) => {
        Object.assign(e.target.style, baseStyle);
      }}
    >
      {children}
    </button>
  );
}

// Action Component with back navigation
function ActionGroup({ action, onSelectAction }) {
  const [quantities, setQuantities] = useState({});
  const [passTimeMinutes, setPassTimeMinutes] = useState(30);

  // If action has no options, treat it as a single immediate action
  if (!action.options || action.options.length === 0) {
    return (
      <Button onClick={() => onSelectAction(action.type, null, null)}>
        {action.type}
      </Button>
    );
  }

  // Special handling for Pass Time action - show numeric input
  if (action.type === 'Pass Time') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <input
          type="number"
          min="1"
          value={passTimeMinutes}
          onChange={(e) => setPassTimeMinutes(parseInt(e.target.value) || 1)}
          style={{
            width: '80px',
            height: '40px',
            padding: '0 8px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}
        />
        <span>minutes</span>
        <Button onClick={() => onSelectAction(action.type, passTimeMinutes, null)}>
          Pass Time
        </Button>
      </div>
    );
  }

  // Special handling for Buy and Craft actions - show quantity inputs
  if (action.type === 'Buy' || action.type === 'Craft') {
    const handleQuantityChange = (optionLabel, value) => {
      const qty = parseInt(value) || 0;
      setQuantities(prev => ({
        ...prev,
        [optionLabel]: qty
      }));
    };

    const handleSubmit = () => {
      const items = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([label, qty]) => ({ label, quantity: qty }));

      if (items.length > 0) {
        onSelectAction(action.type, items, null);
      }
    };

    return (
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {action.options.map((option, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="number"
                min="0"
                value={quantities[option.label] || 0}
                onChange={(e) => handleQuantityChange(option.label, e.target.value)}
                style={{
                  width: '60px',
                  height: '40px',
                  padding: '0 8px',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}
              />
              <div style={{ flex: 1 }}>
                <strong>{option.label}</strong>
                {option.costs && _.size(option.costs) > 0 && (
                  <span style={{ fontSize: '0.9em', marginLeft: '8px', opacity: 0.7 }}>
                    ({Object.entries(option.costs).map(([key, val]) => key === 'money' ? formatCurrency(val) : `${val} ${key}`).join(', ')})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <Button onClick={handleSubmit} disabled={Object.values(quantities).every(q => !q || q === 0)}>
          {action.type === 'Buy' ? 'Submit Order' : 'Craft Items'}
        </Button>
      </div>
    );
  }

  // Regular action - show as buttons
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {action.options.map((option, index) => (
        <Button
          key={index}
          onClick={() => onSelectAction(action.type, option.label, option)}
        >
          {option.label}
          {option.costs && _.size(option.costs) > 0 && (
            <span style={{ fontSize: '0.9em', marginLeft: '8px', opacity: 0.7 }}>
              ({Object.entries(option.costs).map(([key, val]) => `${val} ${key}`).join(', ')})
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}

// Action selector that shows action types first, then options
function ActionSelector({ actions, onSelectAction }) {
  const [selectedActionType, setSelectedActionType] = useState(null);

  const selectedAction = selectedActionType
    ? actions.find(a => a.type === selectedActionType)
    : null;

  if (selectedAction) {
    return (
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button variant="outline" onClick={() => setSelectedActionType(null)}>
            ← Back
          </Button>
          <h2 style={{ margin: 0 }}>{selectedAction.type}</h2>
        </div>
        <ActionGroup
          action={selectedAction}
          onSelectAction={(type, label, option) => {
            onSelectAction(type, label, option);
            setSelectedActionType(null);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px', borderRadius: '5px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {actions.map((action, index) => {
          // If action has no options, execute immediately
          if (!action.options || action.options.length === 0) {
            return (
              <Button
                key={index}
                onClick={() => onSelectAction(action.type, action.label, null)}
              >
                {action.type + (action.label ? `: ${action.label}` : '')}
              </Button>
            );
          }

          // If action has only one option and it's not Buy/Craft, show it at top level
          if (action.options.length === 1 && action.type !== 'Buy' && action.type !== 'Craft') {
            const option = action.options[0];
            return (
              <Button
                key={index}
                onClick={() => onSelectAction(action.type, option.label, option)}
              >
                {action.type}: {option.label}
                {option.costs && _.size(option.costs) > 0 && (
                  <span style={{ fontSize: '0.9em', marginLeft: '8px', opacity: 0.7 }}>
                    ({Object.entries(option.costs).map(([key, val]) => `${val} ${key}`).join(', ')})
                  </span>
                )}
              </Button>
            );
          }

          // Multiple options or Buy/Craft - show submenu
          return (
            <Button
              key={index}
              onClick={() => setSelectedActionType(action.type)}
            >
              {action.type}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default function TestPage() {
  // Force update mechanism
  const [, setUpdateTrigger] = useState(0);
  const forceUpdate = () => setUpdateTrigger(prev => prev + 1);

  // State variables for storage keys
  const [selectedGame, setSelectedGame] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rpg-selected-game');
      return saved || 'lemonadeStand';
    }
    return 'lemonadeStand';
  });

  // Use refs instead of state for game and history
  const gameRef = useRef(null);
  const historyRef = useRef(null);

  // Initialize refs on first render
  if (gameRef.current === null) {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rpg-game-state');
      if (saved) {
        try {
          gameRef.current = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved game:', e);
        }
      }
    }
    if (gameRef.current === null) {
      gameRef.current = allGames[selectedGame];
    }
  }

  if (historyRef.current === null) {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rpg-game-history');
      if (saved) {
        try {
          historyRef.current = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved history:', e);
        }
      }
    }
    if (historyRef.current === null) {
      historyRef.current = [];
    }
  }

  // Methods to update refs
  const updateGame = (newGame) => {
    gameRef.current = newGame;
    if (typeof window !== 'undefined') {
      localStorage.setItem('rpg-game-state', JSON.stringify(newGame));
    }
    forceUpdate();
  };

  const updateHistory = (newHistory) => {
    historyRef.current = newHistory;
    if (typeof window !== 'undefined') {
      localStorage.setItem('rpg-game-history', JSON.stringify(newHistory));
    }
    forceUpdate();
  };

  const addToHistory = (historyItem) => {
    updateHistory([...historyRef.current, historyItem]);
  };

  var [isProcessing, setIsProcessing] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState('');

  // Save selected game to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rpg-selected-game', selectedGame);
    }
  }, [selectedGame]);

  const handleGameChange = (gameKey) => {
    if (confirm('Switching games will reset your current progress. Continue?')) {
      setSelectedGame(gameKey);
      updateGame(allGames[gameKey]);
      updateHistory([]);
    }
  };

  const resetGame = () => {
    if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
      updateGame(allGames[selectedGame]);
      updateHistory([]);
    }
  };

  var getPrompt = (userInput) => {
    return `You are a game engine for a ${gameRef.current.title} simulation game.

Current game state: ${JSON.stringify(gameRef.current, null, 2)}

User action: ${userInput}

Previous history: ${JSON.stringify(historyRef.current, null, 2)}

Generate a JSON response with the following structure:
{
  "additionalStoryText": "Describe what happened next in the story very concisely.",
  "updatedClock": {
    "day": 1,
    "time": [7, 30, "am"]
  },
  "inventoryUpdates": { //differentials to apply to current inventory (e.g., -2 means decrease by 2, +5 means increase by 5)
    "Lemons": -2,
    "Serving of Ice": -1
  },
  "itemsSold": { //sales happen naturally over time based on specified market behavior by location - they should reduce inventory and increase money correspondingly, in addition to any other side-effect costs/incomes from the selected action
    "Lemonade": {"quantity": 3, "revenue": 15}
  },
  "expenses": 10, //money spent on purchases, fees, etc. (optional)
  "grossIncome": 15, //total money earned (optional)
  "netIncome": 5 //net money change (grossIncome - expenses, can be positive, negative, or zero)
  "moneyMade": 15, //if applicable
  "netMoneyChange": 5, //if applicable
  "updatedMoney": <new money amount if changed (optional)>,
  "gameOverMessage": null, //or a string explaining why the game is over if any gameOverConditions are met
  "nextAvailableActions": [
    {
      "type": "Go",
      "options": [
        {"label": "Grocery Store", "costs": {"minutes": 10}},
        {"label": "Park", "costs": {"minutes": 15}}
      ]
    },
    {
      "type": "Craft",
      "options": [
        {"label": "Lemonade", "costs": {"minutes": 0.5, "Lemons": 2, "Ice": 1, "Sugar": 1, "Water": 1, "Cup": 1}}
      ]
    },
    {
      "type": "Investigate", "label": "Search near the window"}
  ]
}

Rules:
- IMPORTANT: Only use "options" array for Go/Travel, Buy, and Craft actions (actions that loop over collections like locations, items). All other actions (Hum, Sleep, Investigate, Talk, Fight, etc.) should be direct actions without options - just {"type": "ActionName", "label": "2-5 words providing context"}.
- Never extend the schema beyond current structure
- Only allow actions that are possible given current inventory, money, time, and location
- Update clock based on time costs
- Write engaging story text for each action
- Don't allow users to craft/build/buy/sell things not in the spec
- Don't allow the user to buy items they can't afford or have not yet unlocked
- Don't apply multiple actions at once other than selling - for example, Renting should not automatically happen just because you Travel somewhere.
- Check gameOverConditions each turn. If any condition is met, set gameOverMessage to a descriptive string explaining what happened.
- If action cannot be completed (insufficient inventory, money, etc), respond with:
  {"success": false, "message": "You don't have enough inventory to craft X" or "You can't afford that"}
- Don't create any new items, locations, actions, etc that are not already defined in the game.

Don't include any other text or markdown formatting - we'll be calling JSON.parse() directly on your response`;
  }

  var handlePrompt = async (userInput) => {
    setIsProcessing(true);
    addToHistory({content: userInput, type: 'prompt'});

    try {
      const response = await fetch('/api/handle-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: getPrompt(userInput) }),
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

  const formatTime = (time) => {
    if (!time) return '';
    const [hour, minute, period] = time;
    return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const game = gameRef.current;
  const history = historyRef.current;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1>{game.title}</h1>
          <select
            value={selectedGame}
            onChange={(e) => handleGameChange(e.target.value)}
            style={{
              height: '40px',
              padding: '0 12px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontFamily: 'monospace',
              cursor: 'pointer'
            }}
          >
            <option value="lemonadeStand">Lemonade Stand</option>
            <option value="farmToTable">Farm to Table</option>
            <option value="fantasy">The Mountain Hums</option>
            <option value="theGuardian">The Guardian</option>
            <option value="cityBuilder">City Builder</option>
          </select>
        </div>
        <Button
          onClick={resetGame}
          variant="outline"
          style={{ backgroundColor: '#fee', borderColor: '#c33', color: '#c33' }}
        >
          Reset Game
        </Button>
      </div>

      {/* Game State */}
      <div style={{ marginBottom: '20px', padding: '10px', borderRadius: '5px' }}>
        {game.clock && (
          <p><strong>Day {game.clock.day}</strong> {formatTime(game.clock.time)}</p>
        )}
        <p>{game.currentLocation}</p>
        {game.money !== undefined && (
          <p><Currency amount={game.money} /></p>
        )}
        {game.weather && (
          <p>{game.weather.condition} {game.weather.high && `(${game.weather.low}°F - ${game.weather.high}°F)`}</p>
        )}
        <br />
        <div style={{}}>
          {game.items && Object.entries(game.items)
            .filter(([_, item]) => item.inventory && item.inventory > 0)
            .map(([itemName, item]) => (
              <div key={itemName}>
                <b>{item.inventory}</b> {itemName}
              </div>
            ))}
        </div>
      </div>

      {/* Story History */}
      <div style={{ marginBottom: '20px', padding: '10px', borderRadius: '5px' }}>
        {game.story && (
          <p style={{ whiteSpace: 'pre-line' }}>{game.story}</p>
        )}
        {history.map(({type, content}, index) => (
          <div key={index} style={{ marginTop: '10px' }}>
            {type === 'prompt' ? (
              <p style={{ fontWeight: 'bold', color: '#0066cc' }}>
                &gt; {content}
              </p>
            ) : type === 'error' ? (
              <div style={{ padding: '10px', backgroundColor: '#fee', borderLeft: '3px solid #f44336', color: '#c33' }}>
                ⚠️ {content.message}
              </div>
            ) : type === 'checkpoint' ? (
              <Button
                onClick={() => {
                  if (confirm(`Load checkpoint from Day ${content.day}? Current progress will be lost.`)) {
                    updateGame(content.gameState);
                    updateHistory(history.slice(0, index + 1));
                    setIsGameOver(false);
                    setGameOverMessage('');
                  }
                }}
                variant="outline"
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '8px'
                }}
              >
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#ffa500'
                }} />
                <span style={{ fontSize: '0.9em', color: '#666' }}>Checkpoint</span>
              </Button>
            ) : type === 'response' ? (
              <div>
                {/* Timestamp from updatedClock */}
                {content.updatedClock && (
                  <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '5px' }}>
                    Day {content.updatedClock.day}, {formatTime(content.updatedClock.time)}
                  </div>
                )}

                {/* Story text */}
                {content.additionalStoryText && (
                  <p style={{ whiteSpace: 'pre-wrap' }}>{content.additionalStoryText}</p>
                )}

                {/* Items sold */}
                {content.itemsSold && Object.keys(content.itemsSold).length > 0 && (
                  <div style={{ padding: '8px', backgroundColor: '#f0f8ff', borderLeft: '3px solid #4CAF50', marginTop: '5px' }}>
                    <strong>Items Sold:</strong>
                    {Object.entries(content.itemsSold).map(([item, data]) => {
                      const qty = data.quantity;
                      const revenue = data.moneyMade;
                      return (
                        <div key={item} style={{ marginLeft: '10px' }}>
                          • {qty}x {item}
                          {revenue && <span style={{ color: '#4CAF50', marginLeft: '8px' }}>(+<Currency amount={revenue} />)</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inventory updates */}
                {content.inventoryUpdates && Object.keys(content.inventoryUpdates).length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    {Object.entries(content.inventoryUpdates).map(([itemName, diff]) => {
                      const newValue = game.items?.[itemName]?.inventory || 0;

                      return (
                        <div key={itemName} style={{color: diff < 0 ? '#c33' : '#4CAF50', marginBottom: '5px' }}>
                          {itemName}: {newValue}
                          <span style={{ marginLeft: '8px', fontSize: '0.9em', opacity: 0.7 }}>
                            ({diff > 0 ? '+' : ''}{diff})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <pre style={{ background: '#f5f5f5', padding: '10px' }}>
                {JSON.stringify(content, null, 2)}
              </pre>
            )}
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
            // Handle Buy/Craft actions with quantities (label is array of items)
            else if ((type === 'Buy' || type === 'Craft') && Array.isArray(label)) {
              const itemList = label.map(item => `${item.quantity}x ${item.label}`).join(', ');
              handlePrompt(`${type}: ${itemList}`);
            }
            // Handle nested options
            else if (label && option && option.label) {
              handlePrompt(`${type}: ${label} - ${option.label}`);
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
          Processing action...
        </div>
      )}
    </div>
  );
}

function PromptBar({onSubmit}) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = () => {
    if (input.trim()) {
      onSubmit(input);
      setInput('');
    }
  };

  return (
    <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
      <h2>Your Action</h2>
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your action here (e.g., 'Travel to Grocery Store', 'Craft Lemonade')..."
        rows={3}
        style={{
          width: '100%',
          padding: '8px',
          fontFamily: 'monospace',
          fontSize: '14px'
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!input.trim()}
        style={{
          marginTop: '10px',
          padding: '10px 20px',
          cursor: input.trim() ? 'pointer' : 'not-allowed',
          backgroundColor: input.trim() ? '#2196F3' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px'
        }}
      >
        Submit
      </button>
    </div>
  );
}
