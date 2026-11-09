import { useState } from 'react';
import { Extras } from './PackageExtras';
import { PkgForm } from './PackageForm';
import { useAuth } from '../shared/AuthContext';
import { peso, ok, run, msg, useLoad, gate } from '../shared/lib';
import { sb } from '../shared/supabase';
export function Packages({ c }) {
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
