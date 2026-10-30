import { useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { sb } from './supabase';
import { useAuth } from './AuthContext';
import { EVENTS, peso, day, ok, run, msg, useLoad, gate, Badge, upload } from './lib';
import { NotesBody } from './Customer';
const TABS = [
  ['', 'Dashboard'],
  ['inq', 'Inquiries & availability'],
  ['pk', 'Packages'],
  ['pf', 'Business Profile'],
  ['nt', 'Notifications'],
];
const STATUSES = [
  'Pending',
  'Replied',
  'Available',
  'Unavailable',
  'Confirmed Outside System',
  'Cancelled',
];
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
function Dash({ c }) {
  const s = useLoad(
    async () => ok(await sb.from('inquiries').select('status').eq('caterer_id', c.caterer_id)),
    [c.caterer_id],
  );
  const g = gate(s);
  if (g) return g;
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Dashboard</h1>
      <div className="stats">
        {STATUSES.map((x) => (
          <div className="card" key={x}>
            <b>{s.data.filter((i) => i.status === x).length}</b>
            {x}
          </div>
        ))}
      </div>
      <p className="muted">Inquiries are not bookings. Reply from Inquiries & availability.</p>
    </>
  );
}
function ProfileTab({ c, reload }) {
  const { me } = useAuth(),
    x = c || {},
    ev = x.event_types || [];
  const [extra, setExtra] = useState(() => ev.filter((e) => !EVENTS.includes(e)));
  const [newEv, setNewEv] = useState('');
  const addEv = () => {
    const t = newEv.trim();
    if (!t) return;
    if ([...EVENTS, ...extra].some((e) => e.toLowerCase() === t.toLowerCase())) {
      msg('That event type is already in the list.', 1);
      return;
    }
    setExtra([...extra, t]);
    setNewEv('');
  };
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Business Profile</h1>
      {!c && (
        <div className="warn">
          Set up your business profile first. Set status to Published when ready.
        </div>
      )}
      <form
        className="card"
        key={x.updated_at}
        onSubmit={run(async (e) => {
          const f = e.target,
            v = (n) => f[n].value.trim(),
            mn = +f.min_guests.value,
            mx = +f.max_guests.value;
          if (mn > mx) throw new Error('Min guests cannot exceed max guests.');
          const nm = [
            ...new Set(
              v('areas')
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean),
            ),
          ];
          if (
            f.status.value === 'Published' &&
            (!v('business_name') ||
              !v('description') ||
              !v('contact_number') ||
              !nm.length ||
              !f.querySelector('[name=ev]:checked') ||
              !mx)
          )
            throw new Error(
              'To publish, complete: business name, description, contact number, at least one service area, at least one event type and guest capacity.',
            );
          const link = v('map_link');
          if (link && !/^https?:\/\//i.test(link))
            throw new Error('Map link must start with http:// or https://');
          const row = {
            business_name: v('business_name'),
            contact_number: v('contact_number'),
            email: v('email') || null,
            address: v('address') || null,
            map_link: link || null,
            logo: f.logofile.files[0] ? await upload(f.logofile.files[0], me.id) : x.logo || null,
            description: v('description'),
            note: v('note'),
            min_guests: mn,
            max_guests: mx,
            out_of_town: f.out_of_town.checked,
            status: f.status.value,
            event_types: [...f.querySelectorAll('[name=ev]:checked')].map((i) => i.value),
          };
          let id = x.caterer_id;
          if (id) {
            const r = await sb.from('caterer_profiles').update(row).eq('caterer_id', id);
            if (r.error) throw r.error;
          } else {
            id = ok(
              await sb
                .from('caterer_profiles')
                .insert({ ...row, user_id: me.id })
                .select('caterer_id')
                .single(),
            ).caterer_id;
          }
          const names = [
            ...new Set(
              v('areas')
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean),
            ),
          ];
          let r = await sb.from('service_areas').delete().eq('caterer_id', id);
          if (r.error) throw r.error;
          if (names.length) {
            r = await sb
              .from('service_areas')
              .insert(names.map((area_name) => ({ caterer_id: id, area_name })));
            if (r.error) throw r.error;
          }
          msg('Profile saved');
          reload();
        })}
      >
        <div className="form2">
          <div>
            <label>Business name *</label>
            <input name="business_name" defaultValue={x.business_name} required />
          </div>
          <div>
            <label>Contact number *</label>
            <input name="contact_number" defaultValue={x.contact_number} required />
          </div>
          <div>
            <label>Business email</label>
            <input name="email" type="email" defaultValue={x.email || ''} />
          </div>
          <div>
            <label>Business address (so customers can find you)</label>
            <input
              name="address"
              defaultValue={x.address || ''}
              placeholder="Street, Barangay, Calbayog City"
              maxLength={200}
            />
          </div>
          <div>
            <label>Map link of your place (Google Maps, optional)</label>
            <input
              name="map_link"
              type="url"
              defaultValue={x.map_link || ''}
              placeholder="Paste your Google Maps link, e.g. https://maps.app.goo.gl/..."
              maxLength={500}
            />
          </div>
          <div>
            <label>Logo (JPG/PNG/WebP, max 2 MB)</label>
            <input type="file" name="logofile" accept="image/jpeg,image/png,image/webp" />
            {x.logo && (
              <img className="thumb" src={x.logo} alt="Current logo" />
            )}
          </div>
          <div>
            <label>Min guests</label>
            <input type="number" name="min_guests" min="0" defaultValue={x.min_guests ?? 0} />
          </div>
          <div>
            <label>Max guests</label>
            <input type="number" name="max_guests" min="0" defaultValue={x.max_guests ?? 0} />
          </div>
        </div>
        <label>Description</label>
        <textarea name="description" rows="3" defaultValue={x.description} />
        <label>Event types</label>
        {[...EVENTS, ...extra].map((e) => (
          <label className="chk" key={e}>
            <input
              type="checkbox"
              name="ev"
              value={e}
              defaultChecked={EVENTS.includes(e) ? ev.includes(e) : true}
            />
            {e}
          </label>
        ))}
        <div className="add-ev">
          <input
            value={newEv}
            onChange={(e) => setNewEv(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addEv();
              }
            }}
            placeholder="Type a new event type (e.g. Debut, Christening)"
            maxLength={60}
          />
          <button type="button" className="btn ghost" onClick={addEv}>
            + Add event
          </button>
        </div>
        <label>Service areas (comma separated)</label>
        <input
          name="areas"
          defaultValue={(x.service_areas || []).map((a) => a.area_name).join(', ')}
          placeholder="Calbayog City, Catbalogan"
        />
        <label className="chk">
          <input type="checkbox" name="out_of_town" defaultChecked={x.out_of_town} />
          Accepts out-of-town events
        </label>
        <label>Travel note</label>
        <input name="note" defaultValue={x.note} />
        <label>Status</label>
        <select name="status" defaultValue={x.status || 'Draft'}>
          <option>Draft</option>
          <option>Published</option>
        </select>
        <br />
        <button className="btn reply-btn">Save profile</button>
      </form>
    </>
  );
}
const CATS = ['Main dish', 'Side', 'Dessert', 'Drinks'];
const pbody = (f) => {
  if (+f.min.value > +f.max.value) throw new Error('Min guests cannot exceed max guests.');
  return {
    name: f.name.value.trim(),
    price: +f.price.value,
    min_guests: +f.min.value,
    max_guests: +f.max.value,
    description: f.description.value.trim(),
    inclusions: f.inc.value
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean),
    tables_chairs: f.tc.value,
    is_customizable: f.cust.checked,
  };
};
function PkgForm({ p = {}, label, onSave }) {
  return (
    <form
      key={p.updated_at}
      onSubmit={run(async (e) => {
        await onSave(pbody(e.target));
      })}
    >
      <div className="form2">
        <div>
          <label>Name *</label>
          <input name="name" defaultValue={p.name} required />
        </div>
        <div>
          <label>Price per head (₱) *</label>
          <input type="number" name="price" min="1" step="0.01" defaultValue={p.price} required />
        </div>
        <div>
          <label>Min guests *</label>
          <input type="number" name="min" min="1" defaultValue={p.min_guests} required />
        </div>
        <div>
          <label>Max guests *</label>
          <input type="number" name="max" min="1" defaultValue={p.max_guests} required />
        </div>
      </div>
      <label>Description *</label>
      <textarea name="description" rows="2" defaultValue={p.description || ''} required />
      <label>Inclusions (comma separated)</label>
      <input name="inc" defaultValue={(p.inclusions || []).join(', ')} />
      <label>Tables and chairs</label>
      <select name="tc" defaultValue={p.tables_chairs || 'Optional'}>
        <option>Optional</option>
        <option>Included</option>
      </select>
      <label className="chk">
        <input type="checkbox" name="cust" defaultChecked={p.is_customizable} />
        Customizable
      </label>
      <br />
      <button className="btn">{label}</button>
    </form>
  );
}
function Extras({ p, reload, uid }) {
  const del = (t, k, v) =>
    run(async () => {
      const r = await sb.from(t).delete().eq(k, v);
      if (r.error) throw r.error;
      reload();
    });
  return (
    <div className="card" style={{ margin: '10px 0', background: '#fffaf5' }}>
      <PkgForm
        p={p}
        label="Save changes"
        onSave={async (b) => {
          const r = await sb.from('catering_packages').update(b).eq('package_id', p.package_id);
          if (r.error) throw r.error;
          msg('Package updated');
          reload();
        }}
      />
      <h3 style={{ marginTop: 18 }}>Sample menu</h3>
      {p.package_menu_items.map((m) => (
        <p key={m.menu_item_id}>
          <span className="muted">{m.category}</span> {m.item_name} ·{' '}
          <a href="#" onClick={del('package_menu_items', 'menu_item_id', m.menu_item_id)}>
            Remove
          </a>
        </p>
      ))}
      <form
        className="form2"
        onSubmit={run(async (e) => {
          const f = e.target,
            r = await sb
              .from('package_menu_items')
              .insert({
                package_id: p.package_id,
                category: f.cat.value,
                item_name: f.item.value.trim(),
              });
          if (r.error) throw r.error;
          f.reset();
          reload();
        })}
      >
        <div>
          <select name="cat">
            {CATS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div>
          <input name="item" placeholder="Item name" required />
        </div>
        <div>
          <button className="btn ghost">Add item</button>
        </div>
      </form>
      <h3 style={{ marginTop: 18 }}>Photos</h3>
      <div className="chips">
        {p.package_photos.map((h) => (
          <span key={h.photo_id}>
            <img className="thumb" src={h.image_url} alt="" />
            <br />
            <small>
              {h.caption} ·{' '}
              <a href="#" onClick={del('package_photos', 'photo_id', h.photo_id)}>
                Remove
              </a>
            </small>
          </span>
        ))}
      </div>
      <form
        onSubmit={run(async (e) => {
          const f = e.target,
            file = f.file.files[0];
          if (!file) throw new Error('Choose an image first.');
          const url = await upload(file, uid);
          const r = await sb
            .from('package_photos')
            .insert({ package_id: p.package_id, image_url: url, caption: f.type.value });
          if (r.error) throw r.error;
          f.reset();
          msg('Photo uploaded');
          reload();
        })}
      >
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp" />
        <select name="type">
          {['Food', 'Package', 'Setup'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <br />
        <br />
        <button className="btn ghost">Upload photo (max 2 MB)</button>
      </form>
    </div>
  );
}
function Packages({ c }) {
  const { me } = useAuth(),
    [open, setOpen] = useState(null),
    [n, setN] = useState(0);
  const s = useLoad(
    async () =>
      ok(
        await sb
          .from('catering_packages')
          .select('*,package_menu_items(*),package_photos(*)')
          .eq('caterer_id', c.caterer_id)
          .order('package_id'),
      ),
    [c.caterer_id],
  );
  const g = gate(s);
  if (g) return g;
  const act = (fn) =>
    run(async () => {
      await fn();
      s.reload();
    });
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Packages</h1>
      <div className="card">
        {s.data.map((p) => (
          <div key={p.package_id}>
            <div className="pk">
              <div>
                <b>{p.name}</b> {!p.is_active && <span className="badge">Hidden</span>}
                <br />
                <span className="muted small">
                  {peso(p.price)}/head · {p.min_guests}–{p.max_guests} guests
                </span>
              </div>
              <div className="small">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpen(open === p.package_id ? null : p.package_id);
                  }}
                >
                  {open === p.package_id ? 'Close' : 'Edit · menu · photos'}
                </a>{' '}
                ·{' '}
                <a
                  href="#"
                  onClick={act(async () => {
                    const r = await sb
                      .from('catering_packages')
                      .update({ is_active: !p.is_active })
                      .eq('package_id', p.package_id);
                    if (r.error) throw r.error;
                  })}
                >
                  {p.is_active ? 'Hide' : 'Show'}
                </a>{' '}
                ·{' '}
                <a
                  href="#"
                  onClick={act(async () => {
                    if (!confirm('Delete this package?')) return;
                    const r = await sb
                      .from('catering_packages')
                      .delete()
                      .eq('package_id', p.package_id);
                    if (r.error) throw r.error;
                  })}
                >
                  Delete
                </a>
              </div>
            </div>
            {open === p.package_id && <Extras p={p} uid={me.id} reload={s.reload} />}
          </div>
        ))}
        {!s.data.length && <p className="muted">No packages yet.</p>}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Add a package</h3>
        <PkgForm
          key={n}
          label="Add package"
          onSave={async (b) => {
            const r = await sb.from('catering_packages').insert({ ...b, caterer_id: c.caterer_id });
            if (r.error) throw r.error;
            msg('Package added');
            setN(n + 1);
            s.reload();
          }}
        />
      </div>
    </>
  );
}
function Inq({ c }) {
  const [sel, setSel] = useState(null),
    [pick, setPick] = useState(null),
    [m, setM] = useState(() => {
      const d = new Date();
      d.setDate(1);
      return d;
    });
  const s = useLoad(async () => {
    const inq = ok(
      await sb
        .from('inquiries')
        .select('*,customers(name),catering_packages(name)')
        .eq('caterer_id', c.caterer_id)
        .order('created_at', { ascending: false }),
    );
    const a = ok(
      await sb.from('caterer_availability').select('day,status').eq('caterer_id', c.caterer_id),
    );
    return { inq, av: Object.fromEntries(a.map((x) => [x.day, x.status])) };
  }, [c.caterer_id]);
  const g = gate(s);
  if (g) return g;
  const { inq, av } = s.data,
    cur = inq.find((i) => i.inquiry_id === sel) || inq[0];
  const y = m.getFullYear(),
    mo = m.getMonth(),
    n = new Date(y, mo + 1, 0).getDate(),
    f = new Date(y, mo, 1).getDay(),
    k = (d) => `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const pend = new Set(inq.filter((i) => i.status === 'Pending').map((i) => i.event_date)),
    cf = inq.find(
      (i) =>
        i.status === 'Pending' &&
        (av[i.event_date] === 'Reserved' || av[i.event_date] === 'Unavailable'),
    );
  const go = (d) => setM(new Date(y, mo + d, 1));
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Inquiries & availability</h1>
      <p className="muted">
        Inquiries are not bookings. Mark a date Reserved only after you agree directly with the
        customer.
      </p>
      {cf && (
        <div className="warn">
          <b>Date conflict:</b> Inquiry {cf.ref} asks for {day(cf.event_date)}, which is already{' '}
          {av[cf.event_date]}.
        </div>
      )}
      <div className="my">
        <div className="card">
          <h3>Incoming inquiries</h3>
          {inq.map((i) => (
            <button
              className={'row ' + (cur && i.inquiry_id === cur.inquiry_id ? 'on' : '')}
              key={i.inquiry_id}
              onClick={() => setSel(i.inquiry_id)}
            >
              <span className="small">{i.ref}</span>
              <span>
                <b>{i.customers?.name || 'Customer'}</b>
                <br />
                <span className="muted small">
                  {i.event_type} · {i.location} · {day(i.event_date)} · {i.guests} guests
                </span>
              </span>
              <Badge s={i.status} />
            </button>
          ))}
          {!inq.length && <p className="muted">No inquiries yet.</p>}
          {cur && (
            <div className="reply small">
              <b>{cur.customers?.name}</b> · {cur.contact_phone}
              <br />
              {cur.event_type} · {cur.location} · {day(cur.event_date)} · {cur.guests} guests
              <br />
              Package: {cur.catering_packages?.name || 'Custom inquiry'} · Budget:{' '}
              {cur.budget || '—'}
              {cur.message && (
                <>
                  <br />
                  Notes: {cur.message}
                </>
              )}
            </div>
          )}
          {cur && (
            <form
              key={cur.inquiry_id + cur.status}
              onSubmit={run(async (e) => {
                const fm = e.target,
                  st = fm.status.value,
                  t = fm.message.value.trim();
                if ((st === 'Unavailable' || st === 'Cancelled') && !t)
                  throw new Error('A reply is required for Unavailable or Cancelled.');
                const r = await sb.rpc('set_inquiry_status', {
                  p_id: cur.inquiry_id,
                  p_status: st,
                  p_message: t,
                });
                if (r.error) throw r.error;
                msg('Reply sent');
                s.reload();
              })}
            >
              <label>Reply to {cur.ref} (required for Unavailable or Cancelled)</label>
              <textarea name="message" rows="3" />
              <label>Set status</label>
              <select name="status">
                {STATUSES.slice(1).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <br />
              <button className="btn reply-btn">Send reply & set status</button>
            </form>
          )}
        </div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="chip" onClick={() => go(-1)}>
              ‹
            </button>
            <h3>{m.toLocaleString('en', { month: 'long', year: 'numeric' })}</h3>
            <button type="button" className="chip" onClick={() => go(1)}>
              ›
            </button>
          </div>
          <div className="cal" style={{ marginTop: 10 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <b key={d}>{d}</b>
            ))}
            {Array.from({ length: f }, (_, i) => (
              <i key={'e' + i} />
            ))}
            {Array.from({ length: n }, (_, i) => {
              const d = i + 1,
                key = k(d),
                st = av[key],
                p = pend.has(key);
              return (
                <button
                  type="button"
                  key={d}
                  className={`day ${st || ''} ${p ? 'pend' : ''} ${pick === key ? 'pick' : ''}`}
                  onClick={() => setPick(key)}
                >
                  {d}
                  {st ? (
                    <small>{st === 'Unavailable' ? 'Unavail.' : st}</small>
                  ) : p ? (
                    <small>Pending</small>
                  ) : null}
                </button>
              );
            })}
          </div>
          <p>
            <button
              type="button"
              className="btn ghost"
              onClick={run(async () => {
                if (!pick) throw new Error('Select a date first.');
                const c0 = av[pick],
                  nx = !c0 ? 'Unavailable' : c0 === 'Unavailable' ? 'Reserved' : null;
                const r = nx
                  ? await sb
                      .from('caterer_availability')
                      .upsert({ caterer_id: c.caterer_id, day: pick, status: nx })
                  : await sb
                      .from('caterer_availability')
                      .delete()
                      .eq('caterer_id', c.caterer_id)
                      .eq('day', pick);
                if (r.error) throw r.error;
                s.reload();
              })}
            >
              Mark selected date
            </button>
          </p>
          {pick && (
            <div className="small">
              <b>{day(pick)}</b>:{' '}
              {inq
                .filter((i) => i.event_date === pick && i.status === 'Pending')
                .map((i) => (
                  <div key={i.inquiry_id}>
                    {i.ref} · {i.customers?.name}
                  </div>
                ))}
              {!inq.some((i) => i.event_date === pick && i.status === 'Pending') &&
                'No pending inquiries'}
            </div>
          )}
          <p className="muted small">
            White: Available · Grey: Unavailable · Navy: Reserved · Dashed: Pending inquiry. Tap
            Mark to cycle Unavailable → Reserved → Available.
          </p>
        </div>
      </div>
    </>
  );
}
