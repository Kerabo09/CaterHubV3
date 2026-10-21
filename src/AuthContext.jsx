import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { sb } from './supabase';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [me, setMe] = useState(null),
    [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (!session) {
      setMe(null);
      setReady(true);
      return null;
    }
    const { data } = await sb
      .from('users')
      .select('user_id,name,roles(role_name)')
      .eq('user_id', session.user.id)
      .maybeSingle();
    const m = data ? { id: data.user_id, name: data.name, role: data.roles.role_name } : null;
    setMe(m);
    setReady(true);
    return m;
  }, []);
  useEffect(() => {
    refresh().catch(() => setReady(true));
  }, [refresh]);
  const logout = async () => {
    await sb.auth.signOut();
    setMe(null);
  };
  if (!ready) return <div className="wrap">Loading…</div>;
  return <Ctx.Provider value={{ me, refresh, logout }}>{children}</Ctx.Provider>;
}
export function Guard({ role, children }) {
  const { me } = useAuth();
  if (!me) return <Navigate to="/login" replace />;
  if (role && me.role !== role) return <Navigate to="/" replace />;
  return children;
}
