import { Link, useSearchParams } from 'react-router-dom';
import { Chips } from './Chips';
import { FilterForm } from './FilterForm';
import { peso, ok, useLoad, gate } from '../shared/lib';
import { sb } from '../shared/supabase';
export function List() {
  const [sp] = useSearchParams();
  const q = Object.fromEntries(sp);
  const s = useLoad(
    async () =>
      ok(
        await sb
          .from('caterer_profiles')
          .select('*,service_areas(area_name),catering_packages(price,is_active)')
          .eq('status', 'Published')
          .order('business_name'),
      ),
    [],
  );
  const g = gate(s);
  if (g) return g;
  let [a, b] = (q.budget || '').split(/[-–]/).map((x) => parseFloat(x.replace(/[^\d.]/g, '')));
  if (b === undefined) {
    b = a;
    a = NaN;
  }
  const n = parseInt(q.guests);
  const rows = s.data.filter((c) => {
    const ps = c.catering_packages.filter((p) => p.is_active).map((p) => +p.price),
      mn = ps.length ? Math.min(...ps) : null;
    return (
      (!q.name || c.business_name.toLowerCase().includes(q.name.toLowerCase())) &&
      (!q.area ||
        c.out_of_town ||
        c.service_areas.some((x) => x.area_name.trim().toLowerCase() === q.area.toLowerCase())) &&
      (!q.event ||
        c.event_types.some((e) => e.toLowerCase().includes(q.event.trim().toLowerCase()))) &&
      (!n || (n >= c.min_guests && n <= c.max_guests)) &&
      (isNaN(a) || (mn !== null && mn >= a)) &&
      (isNaN(b) || (mn !== null && mn <= b))
    );
  });
  return (
    <div className="wrap">
      <h1 style={{ fontSize: 32 }}>Caterers</h1>
      <p className="muted">
        Showing {rows.length} active caterer{rows.length === 1 ? '' : 's'}
      </p>
      <div className="two">
        <FilterForm q={q} className="card">
          <br />
          <button className="btn full">Apply filters</button>
          <p style={{ textAlign: 'center' }}>
            <Link to="/caterers">Clear all</Link>
          </p>
        </FilterForm>
        <div className="cats">
          {rows.map((c) => {
            const ps = c.catering_packages.filter((p) => p.is_active).map((p) => +p.price);
            return (
              <div className="card cat" style={{ padding: 0 }} key={c.caterer_id}>
                <div className="ph">{c.logo ? <img src={c.logo} alt="" /> : 'Photo'}</div>
                <div className="pad">
                  <h3>{c.business_name}</h3>
                  <p className="muted small">
                    {c.service_areas.map((x) => x.area_name).join(', ') || 'Calbayog City'} ·{' '}
                    {c.out_of_town ? 'Out-of-town accepted' : 'Local events only'}
                  </p>
                  {c.address && <p className="muted small">📍 {c.address}</p>}
                  <Chips l={c.event_types} />
                  <p>
                    {c.min_guests}–{c.max_guests} guests
                    {ps.length > 0 && (
                      <>
                        {' '}
                        · from <b>{peso(Math.min(...ps))}/head</b>
                      </>
                    )}
                  </p>
                  <Link className="btn" to={'/caterer/' + c.caterer_id}>
                    View profile
                  </Link>
                </div>
              </div>
            );
          })}
          {!rows.length && <div className="card">No caterers match your filters.</div>}
        </div>
      </div>
    </div>
  );
}
