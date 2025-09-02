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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else if (!isAuthRoute(router.pathname)) {
        router.push('/login');
      }
      setLoading(false);
    });

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else if (!isAuthRoute(router.pathname)) {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  // Check if the current route is an auth route (login, reset password)
  const isAuthRoute = (path) => {
    const authRoutes = ['/login', '/reset-password'];
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
