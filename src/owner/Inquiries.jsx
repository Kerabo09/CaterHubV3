import { useState } from 'react';
import { STATUSES } from './constants';
import { fmt, day, ok, run, msg, useLoad, gate, Badge } from '../shared/lib';
import { sb } from '../shared/supabase';
export function Inq({ c }) {
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
    const mq = await sb.from('inquiry_messages').select('*').order('created_at');
    return { inq, av: Object.fromEntries(a.map((x) => [x.day, x.status])), msgs: mq.error ? [] : mq.data || [] };
  }, [c.caterer_id]);
  const g = gate(s);
  if (g) return g;
  const { inq, av, msgs } = s.data,
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
  const byDay = {};
  inq
    .filter((i) => i.status !== 'Cancelled')
    .forEach((i) => (byDay[i.event_date] = [...(byDay[i.event_date] || []), i]));
  const first = (nm) => (nm || 'Customer').trim().split(' ')[0];
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
          {cur && msgs.some((x) => x.inquiry_id === cur.inquiry_id) && (
            <div className="reply small">
              <b>Customer messages</b>
              {msgs
                .filter((x) => x.inquiry_id === cur.inquiry_id)
                .map((x) => (
                  <div key={x.message_id} style={{ marginTop: 6 }}>
                    {x.sender_role === 'Customer' ? cur.customers?.name || 'Customer' : 'You'} ·{' '}
                    {fmt(x.created_at)}
                    <br />
                    {x.message}
                  </div>
                ))}
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
                p = pend.has(key),
                di = byDay[key] || [];
              return (
                <button
                  type="button"
                  key={d}
                  title={di.map((i) => `${i.customers?.name || 'Customer'} (${i.status})`).join(', ')}
                  className={`day ${st || ''} ${p ? 'pend' : ''} ${pick === key ? 'sel' : ''}`}
                  onClick={() => setPick(key)}
                >
                  {d}
                  {st ? (
                    <small>{st === 'Unavailable' ? 'Unavail.' : st}</small>
                  ) : p ? (
                    <small>Pending</small>
                  ) : null}
                  {di.length > 0 && (
                    <small className="cust">
                      {first(di[0].customers?.name)}
                      {di.length > 1 ? ` +${di.length - 1}` : ''}
                    </small>
                  )}
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
            <div className="small day-inq">
              <b>{day(pick)}</b>
              {(byDay[pick] || []).map((i) => (
                <button
                  type="button"
                  key={i.inquiry_id}
                  className={'row ' + (cur && i.inquiry_id === cur.inquiry_id ? 'on' : '')}
                  onClick={() => setSel(i.inquiry_id)}
                >
                  <span className="small">{i.ref}</span>
                  <span>
                    <b>{i.customers?.name || 'Customer'}</b>
                    <br />
                    <span className="muted small">
                      {i.event_type} · {i.guests} guests
                    </span>
                  </span>
                  <Badge s={i.status} />
                </button>
              ))}
              {!(byDay[pick] || []).length && <div className="muted">No inquiries on this date.</div>}
            </div>
          )}
          <p className="muted small">
            White: Available · Grey: Unavailable · Navy: Reserved · Dashed: Pending inquiry. Tap
            Mark to cycle Unavailable → Reserved → Available. Customer names show on the dates they
            asked for; tap a date to see every inquiry for it.
          </p>
        </div>
      </div>
    </>
  );
}
