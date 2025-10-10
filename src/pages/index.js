import Head from "next/head";
import { EB_Garamond } from "next/font/google";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { allGames } from '../games/exampleGames';
import { v4 as uuidv4 } from 'uuid';

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function Home() {
  const [gameInstances, setGameInstances] = useState([]);
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
        <title></title>
        <meta name="description" content="AI-powered text-based RPG games" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={ebGaramond.className} style={{
        minHeight: '100vh',
        backgroundColor: '#EFECE3',
        color: '#171717',
        padding: '40px 20px'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '48px',
            marginBottom: '40px',
            fontWeight: 600,
            textAlign: 'center'
          }}>

          </h1>

          {/* Start a New Game Section */}
          <section>
            <h2 style={{
              fontSize: '32px',
              marginBottom: '24px',
              paddingLeft: '24px',
              fontWeight: 500
            }}>
              Start a New Game
            </h2>
            <div style={{
              display: 'grid',
              gap: '16px',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
            }}>
              {Object.entries(allGames).map(([key, game]) => (
                <div
                  key={key}
                  onClick={() => createNewGame(key)}
                  style={{
                    border: '1px solid #C4B9A6',
                    borderRadius: '8px',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: '#FFFFFF'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
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
            </div>
          </section>
        </div>


        {/* Continue Your Games Section */}
        {gameInstances.length > 0 && (
          <section style={{ marginBottom: '60px', marginTop: '60px' }}>
            <h2 style={{
              fontSize: '32px',
              marginBottom: '24px',
              paddingLeft: '24px',
              fontWeight: 500
            }}>
              Continue
            </h2>
            <div style={{
              display: 'grid',
              gap: '16px',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
            }}>
              {gameInstances.map(instance => (
                <div
                  key={instance.id}
                  onClick={() => continueGame(instance.id)}
                  style={{
                    border: '1px solid #C4B9A6',
                    borderRadius: '8px',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: '#FAF8F3',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <button
                    onClick={(e) => deleteGameInstance(instance.id, e)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
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
                    margin: '0 0 12px 0',
                    fontSize: '24px',
                    fontWeight: 500
                  }}>
                    {instance.title}
                  </h3>
                  <p style={{
                    margin: '0',
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    Last played: {new Date(instance.lastPlayed).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
