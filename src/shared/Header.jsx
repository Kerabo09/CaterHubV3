import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { sb } from './supabase';
export function Header() {
  const { me, logout } = useAuth();
  const loc = useLocation();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (me?.role !== 'Customer') return;
    sb.from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', me.id)
      .eq('is_read', false)
      .then((r) => setUnread(r.count || 0));
  }, [me, loc.pathname]);
  return (
    <header id="top">
      <Link className="logo" to="/">
        <img src="/logo-icon.png" alt="" />
        <span>
          Cater<b>Hub</b>
        </span>
      </Link>
      <nav>
        {!me && (
          <>
            <Link to="/caterers">Browse caterers</Link>
            <Link to="/">How it works</Link>
            <Link to="/login">Log in</Link>
            <Link className="btn" to="/signup">
              Sign up
            </Link>
          </>
        )}
        {me?.role === 'Customer' && (
          <>
            <Link to="/caterers">Browse caterers</Link>
            <Link to="/my">My inquiries</Link>
            <Link to="/notes">Notifications{unread > 0 ? ` (${unread})` : ''}</Link>
          </>
        )}
        {me?.role === 'Caterer Owner' && <span className="muted">{me.name}</span>}
        {me && (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              logout();
            }}
          >
            Log out
          </a>
        )}
      </nav>
    </header>
  );
}
