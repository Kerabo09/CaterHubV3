import { Link, useParams } from 'react-router-dom';
import { Chips } from './Chips';
import { mapUrl, copyLink } from './mapLinks';
import { useAuth } from '../shared/AuthContext';
import { AvailCalendar, useAvail } from '../shared/AvailCalendar';
import { peso, ok, useLoad, gate, Empty } from '../shared/lib';
import { sb } from '../shared/supabase';
export function Profile() {
  const { id } = useParams(),
    { me } = useAuth();
  const s = useLoad(
    async () =>
      ok(
        await sb
          .from('caterer_profiles')
          .select('*,service_areas(area_name),catering_packages(*,package_photos(image_url))')
          .eq('caterer_id', id)
          .maybeSingle(),
      ),
    [id],
  );
  const av = useAvail(id);
  const g = gate(s);
  if (g) return g;
  const c = s.data;
  if (!c) return <Empty>Caterer not found.</Empty>;
  const ps = c.catering_packages.filter((p) => p.is_active),
    ph = [c.logo, ...ps.flatMap((p) => p.package_photos.map((x) => x.image_url))]
      .filter(Boolean)
      .slice(0, 5);
  return (
    <div className="wrap">
      <p className="muted small">
        <Link to="/caterers">Caterers</Link> / {c.business_name}
      </p>
      <div className="gal">
        {[0, 1, 2, 3, 4].map((i) => (
          <div className="ph" key={i}>
            {ph[i] ? <img src={ph[i]} alt="" /> : 'Photo'}
          </div>
        ))}
      </div>
      <div className="prof">
        <div>
          <h1 style={{ fontSize: 34 }}>{c.business_name}</h1>
          <Chips l={c.event_types} />
          <p>{c.description}</p>
          <div className="card">
            <p>
              <b>Capacity:</b> {c.min_guests}–{c.max_guests} guests
              <br />
              <b>Service areas:</b> {c.service_areas.map((x) => x.area_name).join(', ') || '—'}
              <br />
              {(c.address || c.map_link) && (
                <>
                  <b>Address:</b> {c.address || '—'}
                  <br />
                  {mapUrl(c) && (
                    <>
                      <a href={mapUrl(c)} target="_blank" rel="noopener noreferrer">
                        Open location in maps
                      </a>{' '}
                      <button
                        type="button"
                        className="btn ghost copy-btn"
                        onClick={() => copyLink(mapUrl(c))}
                      >
                        Copy link
                      </button>
                      <br />
                    </>
                  )}
                </>
              )}
              <b>Out-of-town events:</b> {c.out_of_town ? 'Accepted' : 'Not accepted'}
              {c.note && (
                <>
                  <br />
                  <b>Travel note:</b> {c.note}
                </>
              )}
            </p>
          </div>
          <h2>Packages</h2>
          <div className="card">
            {ps.map((p) => (
              <div className="pk" key={p.package_id}>
                <div>
                  <b>{p.name}</b>
                  <br />
                  <span className="muted small">
                    {p.min_guests}–{p.max_guests} guests{p.is_customizable ? ' · Customizable' : ''}
                  </span>
                </div>
                <div>
                  <b>{peso(p.price)}/head</b>{' '}
                  <Link to={'/package/' + p.package_id}>View details</Link>
                </div>
              </div>
            ))}
            {!ps.length && <p className="muted">No packages yet.</p>}
          </div>
        </div>
        <div>
          <div className="card">
            <h3>Send an inquiry</h3>
            {!me ? (
              <>
                <p className="muted">
                  Log in to send an inquiry to this caterer. Guests can browse only.
                </p>
                <Link className="btn full" to="/login">
                  Log in to continue
                </Link>
              </>
            ) : me.role === 'Customer' ? (
              <>
                <p className="muted">Send your event details to this caterer.</p>
                <Link className="btn full" to={'/inquire/' + id}>
                  Send an inquiry
                </Link>
              </>
            ) : (
              <p className="muted">Caterer accounts cannot send inquiries.</p>
            )}
            <hr style={{ border: 0, borderTop: '1px solid var(--line)' }} />
            <p>
              <b>Contact:</b> {c.contact_number || '—'}
            </p>
            <p className="muted small">
              Reserved or Unavailable dates cannot be accepted. The caterer confirms availability
              when replying.
            </p>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h3>Availability</h3>
            {av.data ? <AvailCalendar avail={av.data} /> : <p className="muted">Loading…</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
