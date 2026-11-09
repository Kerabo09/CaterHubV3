import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../shared/AuthContext';
import { peso, ok, useLoad, gate, Empty } from '../shared/lib';
import { sb } from '../shared/supabase';
export function Pkg() {
  const { id } = useParams(),
    { me } = useAuth();
  const s = useLoad(
    async () =>
      ok(
        await sb
          .from('catering_packages')
          .select(
            '*,caterer_profiles(caterer_id,business_name),package_menu_items(*),package_photos(image_url)',
          )
          .eq('package_id', id)
          .maybeSingle(),
      ),
    [id],
  );
  const g = gate(s);
  if (g) return g;
  const p = s.data;
  if (!p) return <Empty>Package not found.</Empty>;
  const c = p.caterer_profiles;
  return (
    <div className="wrap">
      <p className="muted small">
        <Link to="/caterers">Caterers</Link> /{' '}
        <Link to={'/caterer/' + c.caterer_id}>{c.business_name}</Link> / {p.name}
      </p>
      <div className="gal">
        {[0, 1, 2].map((i) => (
          <div className="ph" key={i}>
            {p.package_photos[i] ? <img src={p.package_photos[i].image_url} alt="" /> : 'Photo'}
          </div>
        ))}
      </div>
      <div className="prof">
        <div>
          <h1 style={{ fontSize: 34 }}>{p.name}</h1>
          <p>{p.description}</p>
          <div className="cats">
            <div className="card">
              <h3>Inclusions</h3>
              <ul>
                {p.inclusions.map((i) => (
                  <li key={i}>{i}</li>
                ))}
                {!p.inclusions.length && <li className="muted">None listed</li>}
              </ul>
            </div>
            <div className="card">
              <h3>Sample menu</h3>
              {p.package_menu_items.map((m) => (
                <p key={m.menu_item_id}>
                  <span className="muted">{m.category}</span> {m.item_name}
                </p>
              ))}
              {!p.package_menu_items.length && <p className="muted">Not listed</p>}
            </div>
          </div>
        </div>
        <div className="card">
          <h2 style={{ margin: 0 }}>{peso(p.price)}/head</h2>
          <p>
            <b>Capacity:</b> {p.min_guests}–{p.max_guests} guests
            <br />
            <b>Customizable:</b> {p.is_customizable ? 'Yes' : 'No'}
            <br />
            <b>Tables and chairs:</b> {p.tables_chairs}
          </p>
          {!me ? (
            <Link className="btn full" to="/login">
              Log in to inquire
            </Link>
          ) : (
            me.role === 'Customer' && (
              <Link className="btn full" to={`/inquire/${c.caterer_id}?pkg=${id}`}>
                Inquire about this package
              </Link>
            )
          )}
          <p className="muted small">This sends an inquiry only. It is not a booking.</p>
        </div>
      </div>
    </div>
  );
}
