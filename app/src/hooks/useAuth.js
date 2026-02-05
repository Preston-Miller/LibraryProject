import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Returns { user, session, loading }.
 * user has: id, username (display; from profile or derived from email for now).
 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const user = session?.user
    ? {
        id: session.user.id,
        // TODO: load from profiles table when we have it; for now derive from email
        username:
          session.user.user_metadata?.username ??
          session.user.email?.replace(/@.*$/, '') ??
          'you',
      }
    : null;

  return { user, session, loading };
}
