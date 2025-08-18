import Head from "next/head";
import { Geist, Geist_Mono } from "next/font/google";
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home({session}) {
  const [games, setGames] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.id) {
      fetchGames();
    }
  }, [session]);

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching games:', error);
      return;
    }

    setGames(data || []);
  };

  const createNewGame = async () => {
    if (!session?.user?.id) return;

    setIsCreating(true);
    try {
      const newGame = {
        user_id: session.user.id,
        title: `New Game ${new Date().toLocaleDateString()}`,
        map: {
          elements: {},
          boundaryPolygon: [
            [-500, -500], // Top-left
            [500, -500],  // Top-right
            [500, 500],   // Bottom-right
            [-500, 500]   // Bottom-left
          ]
        },
        background: {},
        element_type_ids: []
      };

      const { data, error } = await supabase
        .from('games')
        .insert([newGame])
        .select()
        .single();

      if (error) {
        console.error('Error creating game:', error);
        alert('Failed to create game. Please try again.');
        return;
      }

      // Navigate to the new game
      router.push(`/games/${data.id}`);
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!session) {
    return (
      <>
        <Head>
          <title>RPG Game Platform</title>
          <meta name="description" content="Create top-down RPG games without coding" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className={`${geistSans.variable} ${geistMono.variable}`}>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h1>RPG Game Platform</h1>
            <p>Please log in to create and manage your RPG games.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>RPG Game Platform</title>
        <meta name="description" content="Create top-down RPG games without coding" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={`${geistSans.variable} ${geistMono.variable}`}>
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
          <h1>My RPG Games</h1>

          <div style={{ marginBottom: '30px' }}>
            <button
              onClick={createNewGame}
              disabled={isCreating}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                opacity: isCreating ? 0.6 : 1
              }}
            >
              {isCreating ? 'Creating...' : 'Create New Game'}
            </button>
          </div>

          {games.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No games yet. Create your first RPG game!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {games.map(game => (
                <div
                  key={game.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                  }}
                  onClick={() => router.push(`/games/${game.id}`)}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <h3 style={{ margin: '0 0 10px 0' }}>{game.title}</h3>
                  <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                    Created: {new Date(game.created_at).toLocaleDateString()}
                  </p>
                  <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                    Elements: {Object.keys(game.map?.elements || {}).length}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
