import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, Guard, useAuth } from './AuthContext';
import { configured, sb } from './supabase';
import { Empty } from './lib';
import { Home, List, Profile, Pkg } from './Public';
import { Signup, Login } from './Auth';
import { Inquire, My, Notes } from './Customer';
import Owner from './Owner';
function Header() {
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
export default function App() {
  if (!configured)
    return (
      <Empty>
        Copy <b>.env.example</b> to <b>.env</b> and set your Supabase URL and anon key, then restart{' '}
        <b>npm run dev</b>.
      </Empty>
    );
  return (
    <AuthProvider>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/caterers" element={<List />} />
        <Route path="/caterer/:id" element={<Profile />} />
        <Route path="/package/:id" element={<Pkg />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/inquire/:id"
          element={
            <Guard role="Customer">
              <Inquire />
            </Guard>
          }
        />
        <Route
          path="/my"
          element={
            <Guard role="Customer">
              <My />
            </Guard>
          }
        />
        <Route
          path="/notes"
          element={
            <Guard role="Customer">
              <Notes />
            </Guard>
          }
        />
        <Route
          path="/owner"
          element={
            <Guard role="Caterer Owner">
              <Owner />
            </Guard>
          }
        />
        <Route
          path="/owner/:tab"
          element={
            <Guard role="Caterer Owner">
              <Owner />
            </Guard>
          }
        />
        <Route
          path="*"
          element={
            <Empty>
              Page not found. <Link to="/">Go home</Link>
            </Empty>
          }
        />
      </Routes>
      <footer className="foot">
        <b>CaterHub</b> · Discovery and inquiries only. Payments and contracts are arranged directly
        with the caterer.
      </footer>
    </AuthProvider>
  );
}
