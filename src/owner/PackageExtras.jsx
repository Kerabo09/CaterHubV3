import { CATS, PkgForm } from './PackageForm';
import { run, msg, upload } from '../shared/lib';
import { sb } from '../shared/supabase';
export function Extras({ p, reload, uid }) {
  const del = (t, k, v) =>
    run(async () => {
      const r = await sb.from(t).delete().eq(k, v);
      if (r.error) throw r.error;
      reload();
    });
  return (
    <div className="card" style={{ margin: '10px 0', background: '#fffaf5' }}>
      <PkgForm
        p={p}
        label="Save changes"
        onSave={async (b) => {
          const r = await sb.from('catering_packages').update(b).eq('package_id', p.package_id);
          if (r.error) throw r.error;
          msg('Package updated');
          reload();
        }}
      />
      <h3 style={{ marginTop: 18 }}>Sample menu</h3>
      {p.package_menu_items.map((m) => (
        <p key={m.menu_item_id}>
          <span className="muted">{m.category}</span> {m.item_name} ·{' '}
          <a href="#" onClick={del('package_menu_items', 'menu_item_id', m.menu_item_id)}>
            Remove
          </a>
        </p>
      ))}
      <form
        className="form2"
        onSubmit={run(async (e) => {
          const f = e.target,
            r = await sb
              .from('package_menu_items')
              .insert({
                package_id: p.package_id,
                category: f.cat.value,
                item_name: f.item.value.trim(),
              });
          if (r.error) throw r.error;
          f.reset();
          reload();
        })}
      >
        <div>
          <select name="cat">
            {CATS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div>
          <input name="item" placeholder="Item name" required />
        </div>
        <div>
          <button className="btn ghost">Add item</button>
        </div>
      </form>
      <h3 style={{ marginTop: 18 }}>Photos</h3>
      <div className="chips">
        {p.package_photos.map((h) => (
          <span key={h.photo_id}>
            <img className="thumb" src={h.image_url} alt="" />
            <br />
            <small>
              {h.caption} ·{' '}
              <a href="#" onClick={del('package_photos', 'photo_id', h.photo_id)}>
                Remove
              </a>
            </small>
          </span>
        ))}
      </div>
      <form
        onSubmit={run(async (e) => {
          const f = e.target,
            file = f.file.files[0];
          if (!file) throw new Error('Choose an image first.');
          const url = await upload(file, uid);
          const r = await sb
            .from('package_photos')
            .insert({ package_id: p.package_id, image_url: url, caption: f.type.value });
          if (r.error) throw r.error;
          f.reset();
          msg('Photo uploaded');
          reload();
        })}
      >
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp" />
        <select name="type">
          {['Food', 'Package', 'Setup'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <br />
        <br />
        <button className="btn ghost">Upload photo (max 2 MB)</button>
      </form>
    </div>
  );
}
