import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../shared/AuthContext';
import { fmt, day, ok, run, msg, useLoad, gate, Badge } from '../shared/lib';
import { sb } from '../shared/supabase';
export function Detail({ i, me }) {
  const s = useLoad(
    async () =>
      ok(
        await sb
          .from('inquiry_status_history')
          .select('*')
          .eq('inquiry_id', i.inquiry_id)
          .order('created_at'),
      ),
    [i.inquiry_id, i.status],
  );
  const ms = useLoad(async () => {
    const q = await sb
      .from('inquiry_messages')
      .select('*')
      .eq('inquiry_id', i.inquiry_id)
      .order('created_at');
    return q.error ? [] : q.data;
  }, [i.inquiry_id, i.status]);
  const h = s.data || [],
    r = [...h].reverse().find((x) => x.message && x.changed_by !== me.id);
  return (
    <>
      <h3>
        {i.ref} · {i.caterer_profiles?.business_name}
      </h3>
      {r && (
        <div className="reply">
          <b>Caterer reply</b>
          <br />
          {r.message}
        </div>
      )}
      <b>Status history</b>
      {h.map((x) => (
        <p className="small" key={x.status_history_id}>
          {x.status} · {fmt(x.created_at)}
        </p>
      ))}
      {(ms.data || []).length > 0 && (
        <>
          <b>Messages</b>
          {ms.data.map((x) => (
            <p className="small" key={x.message_id}>
              {x.sender_role === 'Customer' ? 'You' : 'Caterer'} · {fmt(x.created_at)}
              <br />
              {x.message}
            </p>
          ))}
        </>
      )}
      {i.status === 'Available' && (
        <p className="muted small">
          Available is not a booking. Finalize the quotation, down payment and contract directly
          with the caterer.
        </p>
      )}
    </>
  );
}
export function My() {
  const { me } = useAuth(),
    [pick, setPick] = useState(null),
    [selDay, setSelDay] = useState(null),
    [m, setM] = useState(() => {
      const d = new Date();
      d.setDate(1);
      return d;
    });
  const s = useLoad(
    async () =>
      ok(
        await sb
          .from('inquiries')
          .select('*,caterer_profiles(business_name)')
          .order('created_at', { ascending: false }),
      ),
    [],
  );
  const g = gate(s);
  if (g) return g;
  const d = s.data,
    cur = d.find((x) => x.inquiry_id === pick) || d[0];
  const y = m.getFullYear(),
    mo = m.getMonth(),
    n = new Date(y, mo + 1, 0).getDate(),
    f = new Date(y, mo, 1).getDay(),
    k = (x) => `${y}-${String(mo + 1).padStart(2, '0')}-${String(x).padStart(2, '0')}`;
  const byDay = {};
  d.filter((i) => i.status !== 'Cancelled').forEach(
    (i) => (byDay[i.event_date] = [...(byDay[i.event_date] || []), i]),
  );
  const short = (nm) => (nm || 'Caterer').trim().split(' ')[0];
  const goMonth = (x) => setM(new Date(y, mo + x, 1));
  const openInquiry = (i) => {
    setPick(i.inquiry_id);
    const dt = new Date(i.event_date + 'T00:00');
    setM(new Date(dt.getFullYear(), dt.getMonth(), 1));
    setSelDay(i.event_date);
  };
  return (
    <div className="wrap">
      <div className="my">
        <div className="card">
          <h1 style={{ fontSize: 28 }}>My inquiries</h1>
          {d.map((i) => (
            <div className="mr" key={i.inquiry_id} onClick={() => openInquiry(i)}>
              <span>{i.ref}</span>
              <b>{i.caterer_profiles?.business_name}</b>
              <span>{day(i.event_date)}</span>
              <Badge s={i.status} />
              <span>
                {i.status === 'Pending' && (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.stopPropagation();
                      run(async () => {
                        if (!confirm('Cancel this inquiry?')) return;
                        ok(
                          await sb
                            .rpc('set_inquiry_status', {
                              p_id: i.inquiry_id,
                              p_status: 'Cancelled',
                              p_message: 'Cancelled by customer',
                            })
                            .then((r) => ({ data: 1, error: r.error })),
                        );
                        msg('Inquiry cancelled');
                        s.reload();
                      })(e);
                    }}
                  >
                    Cancel
                  </a>
                )}
              </span>
            </div>
          ))}
          {!d.length && (
            <p className="muted">
              No inquiries yet. <Link to="/caterers">Browse caterers</Link>
            </p>
          )}
          <p className="muted small">You can cancel only Pending inquiries.</p>
        </div>
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="chip" onClick={() => goMonth(-1)}>
                ‹
              </button>
              <h3>{m.toLocaleString('en', { month: 'long', year: 'numeric' })}</h3>
              <button type="button" className="chip" onClick={() => goMonth(1)}>
                ›
              </button>
            </div>
            <div className="cal" style={{ marginTop: 10 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
                <b key={w}>{w}</b>
              ))}
              {Array.from({ length: f }, (_, i) => (
                <i key={'e' + i} />
              ))}
              {Array.from({ length: n }, (_, i) => {
                const x = i + 1,
                  key = k(x),
                  di = byDay[key] || [];
                return (
                  <button
                    type="button"
                    key={x}
                    title={di
                      .map((q) => `${q.caterer_profiles?.business_name || 'Caterer'} (${q.status})`)
                      .join(', ')}
                    className={`day ${di.length ? 'c-' + di[0].status.replace(/\s/g, '') : ''} ${
                      selDay === key ? 'sel' : ''
                    }`}
                    onClick={() => setSelDay(key)}
                  >
                    {x}
                    {di.length > 0 && (
                      <>
                        <small className="cust">{short(di[0].caterer_profiles?.business_name)}</small>
                        <small>
                          {di[0].status}
                          {di.length > 1 ? ` +${di.length - 1}` : ''}
                        </small>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            {selDay && (
              <div className="small day-inq">
                <b>{day(selDay)}</b>
                {(byDay[selDay] || []).map((i) => (
                  <button
                    type="button"
                    key={i.inquiry_id}
                    className={'row ' + (cur && i.inquiry_id === cur.inquiry_id ? 'on' : '')}
                    onClick={() => setPick(i.inquiry_id)}
                  >
                    <span className="small">{i.ref}</span>
                    <span>
                      <b>{i.caterer_profiles?.business_name || 'Caterer'}</b>
                      <br />
                      <span className="muted small">
                        {i.event_type} · {i.guests} guests
                      </span>
                    </span>
                    <Badge s={i.status} />
                  </button>
                ))}
                {!(byDay[selDay] || []).length && (
                  <div className="muted">No inquiries on this date.</div>
                )}
              </div>
            )}
            <p className="muted small">
              Dates you asked a caterer for are colored by status. Tap a date to see the inquiry.
            </p>
          </div>
          <div className="card" style={{ marginTop: 20 }}>
            {cur ? (
              <Detail i={cur} me={me} />
            ) : (
              <p className="muted">Select an inquiry to see its status history.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
