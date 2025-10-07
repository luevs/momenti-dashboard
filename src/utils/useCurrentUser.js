import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// Hook simple: retorna { id, email, name, role } o null
export default function useCurrentUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data?.session ?? null;
      if (session && session.user) {
        const u = session.user;
        const meta = u.user_metadata || {};
        setUser({ id: u.id, email: u.email, name: meta.name || u.email, role: meta.role || null });
      } else {
        // fallback localStorage
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
          setUser(raw ? JSON.parse(raw) : null);
        } catch (e) {
          setUser(null);
        }
      }
    }).catch(() => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
        setUser(raw ? JSON.parse(raw) : null);
      } catch (e) {
        setUser(null);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      const sess = s?.session ?? s ?? null;
      if (sess && sess.user) {
        const u = sess.user;
        const meta = u.user_metadata || {};
        setUser({ id: u.id, email: u.email, name: meta.name || u.email, role: meta.role || null });
      }
    });

    return () => {
      mounted = false;
      if (data?.subscription && typeof data.subscription.unsubscribe === 'function') data.subscription.unsubscribe();
    };
  }, []);

  return user;
}
