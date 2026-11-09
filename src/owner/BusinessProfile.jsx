import { useState } from 'react';
import { useAuth } from '../shared/AuthContext';
import { EVENTS, ok, run, msg, upload } from '../shared/lib';
import { sb } from '../shared/supabase';
export function ProfileTab({ c, reload }) {
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
          <option>Deactivated</option>
        </select>
        <br />
        <button className="btn reply-btn">Save profile</button>
      </form>
    </>
  );
}
