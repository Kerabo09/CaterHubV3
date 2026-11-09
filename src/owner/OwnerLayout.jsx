import { NavLink, useParams } from 'react-router-dom';
import { ProfileTab } from './BusinessProfile';
import { Dash } from './Dashboard';
import { Inq } from './Inquiries';
import { Packages } from './Packages';
import { TABS } from './constants';
import { useAuth } from '../shared/AuthContext';
import { NotesBody } from '../shared/NotificationsList';
import { ok, useLoad, gate } from '../shared/lib';
import { sb } from '../shared/supabase';
export default function Owner() {
  const { tab = '' } = useParams(),
    { me } = useAuth();
  const s = useLoad(
    async () =>
      ok(
        await sb
          .from('caterer_profiles')
          .select('*,service_areas(area_name)')
          .eq('user_id', me.id)
          .maybeSingle(),
      ),
    [me.id],
  );
  const u = useLoad(async () => {
    const r = await sb
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', me.id)
      .eq('is_read', false);
    return r.count || 0;
  }, [tab]);
  const g = gate(s);
  if (g) return g;
  const c = s.data,
    t = c ? tab : 'pf';
  return (
    <div className="shell">
      <aside>
        <nav>
          {TABS.map(([k, l]) => (
            <NavLink key={k} end to={'/owner/' + k} className={t === k ? 'on' : ''}>
              {l}
              {k === 'nt' && t !== 'nt' && u.data > 0 ? ` (${u.data})` : ''}
            </NavLink>
          ))}
        </nav>
        <p className="small">
          {c?.business_name || 'No profile yet'}
          <br />
          Profile: {c?.status || 'Not set up'}
        </p>
      </aside>
      <main>
        {t === 'pf' ? (
          <ProfileTab c={c} reload={s.reload} />
        ) : t === 'nt' ? (
          <NotesBody />
        ) : t === 'pk' ? (
          <Packages c={c} />
        ) : t === 'inq' ? (
          <Inq c={c} />
        ) : (
          <Dash c={c} />
        )}
      </main>
    </div>
  );
}
