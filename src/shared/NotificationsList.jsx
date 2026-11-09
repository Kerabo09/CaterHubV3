import { useState } from 'react';
import { useAuth } from './AuthContext';
import { fmt, ok, run, msg, useLoad, gate } from './lib';
import { sb } from './supabase';
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
