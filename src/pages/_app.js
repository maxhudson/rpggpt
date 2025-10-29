import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import '@/styles/globals.css';

export default function App({ Component, pageProps }) {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // AUTHENTICATION DISABLED - Everything runs from localStorage
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      }
      // Removed redirect to /login - authentication not required
      setLoading(false);
    });

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      }
      // Removed redirect to /login - authentication not required
      setLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  // Check if the current route is an auth route (login, reset password) or public route
  const isAuthRoute = (path) => {
    const authRoutes = ['/login', '/reset-password', '/generate'];
    return authRoutes.includes(path);
  };

  // Fetch user profile from Supabase
  const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setUserProfile(data);
    } else if (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Component
      {...pageProps}
      session={session}
      userProfile={userProfile}
    />
  );
}
