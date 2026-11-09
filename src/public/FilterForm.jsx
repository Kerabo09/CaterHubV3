import { useNavigate } from 'react-router-dom';
import { EVENTS, ok, useLoad } from '../shared/lib';
import { sb } from '../shared/supabase';
export function FilterForm({ q, className, children }) {
  const nav = useNavigate();
  const s = useLoad(
    async () =>
      [
        ...new Set(ok(await sb.from('service_areas').select('area_name')).map((a) => a.area_name)),
      ].sort(),
    [],
  );
  const ar = s.data || [];
  return (
    <form
      className={className}
      key={JSON.stringify(q) + ar.length}
      onSubmit={(e) => {
        e.preventDefault();
        const p = new URLSearchParams();
        new FormData(e.target).forEach((v, k) => {
          if (String(v).trim()) p.set(k, String(v).trim());
        });
        nav('/caterers?' + p);
      }}
    >
      <div>
        <label>Business name</label>
        <input name="name" defaultValue={q.name || ''} placeholder="Search by name" />
      </div>
      <div>
        <label>Location</label>
        <select name="area" defaultValue={q.area || ''}>
          <option value="">Any area</option>
          {ar.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Event type</label>
        <input
          name="event"
          list="event-list"
          className="combo"
          defaultValue={q.event || ''}
          placeholder="Any event (type or pick)"
          maxLength={60}
          autoComplete="off"
        />
        <datalist id="event-list">
          {EVENTS.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </div>
      <div>
        <label>Guests</label>
        <input
          name="guests"
          type="number"
          min="1"
          defaultValue={q.guests || ''}
          placeholder="Number"
        />
      </div>
      <div>
        <label>Budget per head</label>
        <input name="budget" defaultValue={q.budget || ''} placeholder="₱ min – max" />
      </div>
      {children}
    </form>
  );
}
