import Head from "next/head";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { allGames } from '../games/exampleGames';
import { v4 as uuidv4 } from 'uuid';
import { primaryFont } from '../styles/fonts';
import { Button } from '@/game-page/Button';

export default function Home() {
  const [gameInstances, setGameInstances] = useState([]);
  const [mode, setMode] = useState(null); // null, 'new', or 'continue'
  const router = useRouter();

  useEffect(() => {
    loadGameInstances();
  }, []);

  const loadGameInstances = () => {
    if (typeof window === 'undefined') return;

    const instances = [];
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith('game-instance-')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          instances.push({
            id: key.replace('game-instance-', ''),
            ...data
          });
        } catch (e) {
          console.error('Failed to parse game instance:', key, e);
        }
      }
    }

    // Sort by last played (most recent first)
    instances.sort((a, b) => {
      const timeA = new Date(a.lastPlayed || 0).getTime();
      const timeB = new Date(b.lastPlayed || 0).getTime();
      return timeB - timeA;
    });

    setGameInstances(instances);
  };

  const createNewGame = (gameKey) => {
    const gameId = uuidv4();
    const game = allGames[gameKey];

    // Copy the full game state to localStorage
    const gameState = JSON.parse(JSON.stringify(game));
    localStorage.setItem(`game-state-${gameId}`, JSON.stringify(gameState));

    // Initialize empty history
    localStorage.setItem(`game-history-${gameId}`, JSON.stringify([]));

    // Initialize game instance metadata
    const gameInstance = {
      title: game.title,
      lastPlayed: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    localStorage.setItem(`game-instance-${gameId}`, JSON.stringify(gameInstance));

    // Navigate to the game
    router.push(`/game/${gameId}`);
  };

  const continueGame = (instanceId) => {
    // Update last played timestamp
    const key = `game-instance-${instanceId}`;
    try {
      const data = JSON.parse(localStorage.getItem(key));
      data.lastPlayed = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to update last played:', e);
    }

    router.push(`/game/${instanceId}`);
  };

  const deleteGameInstance = (instanceId, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this game? This cannot be undone.')) {
      localStorage.removeItem(`game-instance-${instanceId}`);
      localStorage.removeItem(`game-state-${instanceId}`);
      localStorage.removeItem(`game-history-${instanceId}`);
      loadGameInstances();
    }
  };

  return (
    <>
      <Head>
        <title>RPG GPT</title>
        <meta name="description" content="AI-powered text-based RPG games" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={primaryFont.className} style={{
        minHeight: '100vh',
        backgroundColor: 'rgba(68, 64, 61, 1)',
        color: '#171717',
        padding: '40px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ maxWidth: '600px', width: '100%' }}>
          {/* Initial Mode Selection */}
          {mode === null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Button
                onClick={() => setMode('new')}
              >
                New Game
              </Button>
              {gameInstances.length > 0 && (
                <Button
                  onClick={() => setMode('continue')}
                >
                  Continue
                </Button>
              )}
            </div>
          )}

          {/* New Game Mode */}
          {mode === 'new' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(allGames).map(([key, game]) => (
                  <div
                    key={key}
                    onClick={() => createNewGame(key)}
                  >
                    <h3 style={{
                      margin: '0 0 12px 0',
                      fontSize: '24px',
                      fontWeight: 500
                    }}>
                      {game.title}
                    </h3>
                    {game.description && (
                      <p style={{
                        margin: '0',
                        color: '#666',
                        fontSize: '16px',
                        lineHeight: '1.5'
                      }}>
                        {game.description}
                      </p>
                    )}
                  </div>
                ))}

                {/* Back Button */}
                <Button
                  onClick={() => setMode(null)}
                >
                  ← Back
                </Button>
              </div>
            </div>
          )}

          {/* Continue Game Mode */}
          {mode === 'continue' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {/* Back Button */}
                <Button
                  onClick={() => setMode(null)}
                >
                  ← Back
                </Button>
                {gameInstances.map(instance => (
                  <div
                    key={instance.id}
                    onClick={() => continueGame(instance.id)}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    <button
                      onClick={(e) => deleteGameInstance(instance.id, e)}
                      style={{
                        position: 'absolute',
                        top: '9px',
                        left: '-24px',
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        color: '#999',
                        padding: '4px 8px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#c33';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#999';
                      }}
                    >
                      ×
                    </button>
                    <h3 style={{
                      margin: '0 0 2px 0',
                      fontSize: '16px',
                      fontWeight: 500
                    }}>
                      {instance.title}
                    </h3>
                    <p style={{
                      margin: '0',
                      color: '#666',
                      fontSize: '12px'
                    }}>
                      {new Date(instance.lastPlayed).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
