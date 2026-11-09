import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../shared/AuthContext';
import { AvailCalendar, BLOCKED, useAvail } from '../shared/AvailCalendar';
import { EVENTS, peso, today, ok, run, msg, useLoad, gate, Empty } from '../shared/lib';
import { sb } from '../shared/supabase';
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
