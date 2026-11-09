import { useState } from 'react';
import { sb } from './supabase';
import { useLoad, today } from './lib';

export const BLOCKED = ['Reserved', 'Unavailable'];

// Loads the caterer's Reserved / Unavailable dates: { map: { 'YYYY-MM-DD': status }, failed }
export function useAvail(id) {
  return useLoad(async () => {
    const r = await sb.from('caterer_availability').select('day,status').eq('caterer_id', id);
    if (r.error) return { map: {}, failed: true };
    return { map: Object.fromEntries(r.data.map((x) => [x.day, x.status])), failed: false };
  }, [id]);
}

// Month calendar of a caterer's availability. Pass onPick to let the customer choose a free date.
export function AvailCalendar({ avail, value, onPick }) {
  const [m, setM] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const av = avail?.map || {},
    t = today(),
    y = m.getFullYear(),
    mo = m.getMonth(),
    n = new Date(y, mo + 1, 0).getDate(),
    f = new Date(y, mo, 1).getDay(),
    k = (d) => `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const go = (d) => setM(new Date(y, mo + d, 1));
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" className="chip" onClick={() => go(-1)}>
          ‹
        </button>
        <h3>{m.toLocaleString('en', { month: 'long', year: 'numeric' })}</h3>
        <button type="button" className="chip" onClick={() => go(1)}>
          ›
        </button>
      </div>
      <div className={'cal' + (onPick ? '' : ' ro')} style={{ marginTop: 10 }}>
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
            blocked = BLOCKED.includes(st),
            past = key < t;
          return (
            <button
              type="button"
              key={d}
              tabIndex={onPick ? 0 : -1}
              className={`day ${st || ''} ${past ? 'past' : ''} ${value === key ? 'sel' : ''}`}
              onClick={() => onPick && !blocked && !past && onPick(key)}
            >
              {d}
              {st && <small>{st === 'Unavailable' ? 'Unavail.' : st}</small>}
            </button>
          );
        })}
      </div>
      <p className="muted small">
        {avail?.failed
          ? 'Availability is not shown yet. The caterer will confirm the date when replying.'
          : 'White: free · Navy: Reserved · Grey: Unavailable. The caterer still confirms the date when replying.'}
      </p>
    </>
  );
}
