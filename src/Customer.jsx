import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { sb } from './supabase';
import { AvailCalendar, BLOCKED, useAvail } from './AvailCalendar';
import { useAuth } from './AuthContext';
import { EVENTS, peso, fmt, day, today, ok, run, msg, useLoad, gate, Badge, Empty } from './lib';
export function Inquire() {
  const { id } = useParams(),
    [sp] = useSearchParams(),
    { me } = useAuth(),
    nav = useNavigate();
  const s = useLoad(
    async () =>
      ok(
        await sb
          .from('caterer_profiles')
          .select('*,catering_packages(*)')
          .eq('caterer_id', id)
          .maybeSingle(),
      ),
    [id],
  );
  const [pkg, setPkg] = useState(null);
  const [date, setDate] = useState('');
  const av = useAvail(id);
  const g = gate(s);
  if (g) return g;
  const c = s.data;
  if (!c) return <Empty>Caterer not found.</Empty>;
  const ps = c.catering_packages.filter((p) => p.is_active),
    sel = pkg ?? (sp.get('pkg') || (ps[0] ? String(ps[0].package_id) : '')),
    ev = c.event_types.length ? c.event_types : EVENTS;
  const Opt = ({ v, children }) => (
    <label className={'opt ' + (sel === v ? 'on' : '')}>
      <input type="radio" checked={sel === v} onChange={() => setPkg(v)} /> {children}
    </label>
  );
  return (
    <div className="wrap">
      <div className="my">
        <form
          className="card"
          onSubmit={run(async (e) => {
            const f = Object.fromEntries(new FormData(e.target)),
              n = parseInt(f.guests);
            if (f.event_date < today()) throw new Error('Past dates are not accepted.');
            const blocked = av.data?.map?.[f.event_date];
            if (BLOCKED.includes(blocked))
              throw new Error(`That date is already ${blocked}. Please choose another date.`);
            const evType = (f.event_type || '').trim();
            if (!evType) throw new Error('Please type the event type.');
            if (!(n >= 1)) throw new Error('Guest count must be 1 or more.');
            const p = ps.find((x) => String(x.package_id) === sel);
            if (p && (n < p.min_guests || n > p.max_guests))
              throw new Error(`This package fits ${p.min_guests}–${p.max_guests} guests.`);
            const cu = ok(
              await sb.from('customers').select('customer_id').eq('user_id', me.id).maybeSingle(),
            );
            if (!cu) throw new Error('Customer profile not found.');
            const r = ok(
              await sb
                .from('inquiries')
                .insert({
                  customer_id: cu.customer_id,
                  caterer_id: +id,
                  package_id: p ? p.package_id : null,
                  event_date: f.event_date,
                  event_type: evType,
                  location: f.location.trim(),
                  guests: n,
                  contact_phone: f.contact_phone.trim(),
                  budget: f.budget.trim(),
                  message: f.message.trim(),
                })
                .select('ref')
                .single(),
            );
            msg('Inquiry sent. Reference ' + r.ref);
            nav('/my');
          })}
        >
          <h1 style={{ fontSize: 28 }}>Send an inquiry to {c.business_name}</h1>
          <p className="muted">Fields marked * are required. This is an inquiry, not a booking.</p>
          <label>Package or custom inquiry *</label>
          {ps.map((p) => (
            <Opt key={p.package_id} v={String(p.package_id)}>
              <b>{p.name}</b>
              <br />
              <span className="muted small">
                {peso(p.price)}/head · {p.min_guests}–{p.max_guests} guests
              </span>
            </Opt>
          ))}
          <Opt v="">
            <b>Custom inquiry</b>
            <br />
            <span className="muted small">Describe what you need below</span>
          </Opt>
          <div className="form2">
            <div>
              <label>Event date *</label>
              <input
                type="date"
                name="event_date"
                min={today()}
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {BLOCKED.includes(av.data?.map?.[date]) ? (
                <span className="small" style={{ color: 'var(--rust)' }}>
                  This date is already {av.data.map[date]}. Please choose another date.
                </span>
              ) : (
                <span className="muted small">Past dates are not accepted.</span>
              )}
            </div>
            <div>
              <label>Event type *</label>
              <input
                name="event_type"
                list="inq-events"
                className="combo"
                placeholder="Type or pick an event type"
                maxLength={60}
                autoComplete="off"
                required
              />
              <datalist id="inq-events">
                {ev.map((e) => (
                  <option key={e} value={e} />
                ))}
              </datalist>
            </div>
            <div>
              <label>Event location *</label>
              <input name="location" required />
            </div>
            <div>
              <label>Guest count *</label>
              <input type="number" name="guests" min="1" step="1" required />
              <span className="muted small">Whole number, 1 or more.</span>
            </div>
            <div>
              <label>Contact number *</label>
              <input name="contact_phone" placeholder="09XX XXX XXXX" required />
            </div>
            <div>
              <label>Budget (optional)</label>
              <input name="budget" placeholder="₱" />
            </div>
          </div>
          <label>Special requests (optional)</label>
          <textarea name="message" rows="3" />
          <br />
          <button className="btn">Send inquiry</button>
        </form>
        <div>
          <div className="card">
            <h3>Caterer availability</h3>
            {av.data ? (
              <AvailCalendar avail={av.data} value={date} onPick={setDate} />
            ) : (
              <p className="muted">Loading…</p>
            )}
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h3>What happens next</h3>
            <ol className="muted">
              <li>You get a reference number. Status: Pending.</li>
              <li>The caterer checks their calendar and replies.</li>
              <li>You see the reply and status in your dashboard.</li>
              <li>Quotation, down payment and contract are arranged directly with the caterer.</li>
            </ol>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h3>Service area</h3>
            <p>
              Out-of-town events: {c.out_of_town ? 'accepted' : 'not accepted'}
              {c.note && (
                <>
                  <br />
                  <span className="muted">Travel note: {c.note}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
function Detail({ i, me }) {
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
export function NotesBody() {
  const { me } = useAuth();
  const [picked, setPicked] = useState(new Set());
  const [replyTo, setReplyTo] = useState(null);
  const [text, setText] = useState('');
  const s = useLoad(async () => {
    const d = ok(
      await sb
        .from('notifications')
        .select('*')
        .eq('user_id', me.id)
        .order('created_at', { ascending: false })
        .limit(50),
    );
    await sb
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', me.id)
      .eq('is_read', false);
    return d;
  }, []);
  const g = gate(s);
  if (g) return g;
  const allPicked = s.data.length > 0 && picked.size === s.data.length;
  const toggle = (id) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const clearPicked = run(async () => {
    if (!picked.size) throw new Error('Select at least one notification to clear.');
    const r = await sb
      .from('notifications')
      .delete()
      .in('notification_id', [...picked])
      .eq('user_id', me.id)
      .select('notification_id');
    if (r.error) throw r.error;
    if (!r.data.length)
      throw new Error('Could not clear. Run caterhub_safe_update.sql in Supabase first.');
    setPicked(new Set());
    s.reload();
    msg('Notifications cleared');
  });
  // customers can reply to a caterer's update on an inquiry
  const refOf = (n) => (n.message.match(/INQ-\d+/) || [])[0],
    canReply = (n) => me.role === 'Customer' && refOf(n) && n.message.includes(' updated ');
  const sendReply = (n) =>
    run(async () => {
      const t = text.trim();
      if (!t) throw new Error('Please type your reply.');
      const r = await sb.rpc('reply_to_inquiry', { p_ref: refOf(n), p_message: t });
      if (r.error) {
        if ((r.error.message || '').includes('reply_to_inquiry'))
          throw new Error('Replying is not set up yet. Run caterhub_safe_update.sql in Supabase.');
        throw r.error;
      }
      msg('Reply sent to the caterer');
      setReplyTo(null);
      setText('');
    });
  return (
    <>
      <h1 style={{ fontSize: 28 }}>Notifications</h1>
      <div className="card">
        {s.data.length > 0 && (
          <div className="note-bar">
            <button
              type="button"
              className="btn ghost"
              onClick={() =>
                setPicked(allPicked ? new Set() : new Set(s.data.map((n) => n.notification_id)))
              }
            >
              {allPicked ? 'Unselect all' : 'Select all'}
            </button>
            <button type="button" className="btn" disabled={!picked.size} onClick={clearPicked}>
              Clear{picked.size ? ` (${picked.size})` : ''}
            </button>
          </div>
        )}
        {s.data.map((n) => (
          <div className="note-wrap" key={n.notification_id}>
            <label className="note">
              <input
                type="checkbox"
                checked={picked.has(n.notification_id)}
                onChange={() => toggle(n.notification_id)}
              />
              <span style={{ fontWeight: n.is_read ? 400 : 700 }}>
                {n.message}
                <br />
                <span className="muted small">{fmt(n.created_at)}</span>
              </span>
            </label>
            {canReply(n) && (
              <div className="note-reply">
                {replyTo === n.notification_id ? (
                  <>
                    <textarea
                      rows="3"
                      maxLength={1000}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={`Reply to the caterer about ${refOf(n)}...`}
                    />
                    <div className="note-bar" style={{ marginTop: 8, marginBottom: 0 }}>
                      <button type="button" className="btn" onClick={sendReply(n)}>
                        Send reply
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          setReplyTo(null);
                          setText('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn ghost reply-link"
                    onClick={() => {
                      setReplyTo(n.notification_id);
                      setText('');
                    }}
                  >
                    Reply to caterer
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {!s.data.length && <p className="muted">Nothing yet.</p>}
      </div>
    </>
  );
}
export const Notes = () => (
  <div className="wrap">
    <NotesBody />
  </div>
);
