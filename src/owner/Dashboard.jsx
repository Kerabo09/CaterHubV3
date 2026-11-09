import { STATUSES } from './constants';
import { ok, useLoad, gate } from '../shared/lib';
import { sb } from '../shared/supabase';
export function Dash({ c }) {
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
