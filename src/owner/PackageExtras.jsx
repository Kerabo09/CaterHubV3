import { useMemo, useState } from 'react';
import { CATS, PkgForm, pbody } from './PackageForm';
import { run, msg, upload } from '../shared/lib';
import { sb } from '../shared/supabase';
export function Extras({ p, reload, uid }) {
  // Menu and photo changes are kept here until "Save changes" is clicked.
  const [newItems, setNewItems] = useState([]); // items added with Enter: { category, item_name }
  const [delItems, setDelItems] = useState([]); // menu_item_id to remove
  const [delPhotos, setDelPhotos] = useState([]); // photo_id to remove
  const [cat, setCat] = useState(CATS[0]);
  const [item, setItem] = useState(''); // item being typed
  const [type, setType] = useState('Food');
  const [files, setFiles] = useState([]); // photos chosen, not uploaded yet
  const [fileKey, setFileKey] = useState(0);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  const typed = item.trim() ? 1 : 0;
  const pending = newItems.length + typed + delItems.length + files.length + delPhotos.length;
  const toggle = (list, setList, id) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  // Enter in the item box keeps the item in the list so you can type another one
  const stageItem = () => {
    const name = item.trim();
    if (!name) return;
    setNewItems([...newItems, { category: cat, item_name: name }]);
    setItem('');
  };

  const save = run(async (e) => {
    const body = pbody(e.target);
    const items = [...newItems, ...(typed ? [{ category: cat, item_name: item.trim() }] : [])];
    // 1) package details
    let r = await sb.from('catering_packages').update(body).eq('package_id', p.package_id);
    if (r.error) throw r.error;
    // 2) sample menu
    if (delItems.length) {
      r = await sb.from('package_menu_items').delete().in('menu_item_id', delItems);
      if (r.error) throw r.error;
      setDelItems([]);
    }
    if (items.length) {
      r = await sb
        .from('package_menu_items')
        .insert(items.map((m) => ({ package_id: p.package_id, ...m })));
      if (r.error) throw r.error;
      setNewItems([]);
      setItem('');
    }
    // 3) photos
    if (delPhotos.length) {
      r = await sb.from('package_photos').delete().in('photo_id', delPhotos);
      if (r.error) throw r.error;
      setDelPhotos([]);
    }
    for (const f of files) {
      const url = await upload(f, uid);
      r = await sb
        .from('package_photos')
        .insert({ package_id: p.package_id, image_url: url, caption: type });
      if (r.error) throw r.error;
      setFiles((list) => list.filter((x) => x !== f));
    }
    setFileKey((k) => k + 1);
    msg('Changes saved');
    reload();
  });

  return (
    <div className="card extras" style={{ margin: '10px 0', background: '#fffaf5' }}>
      <form onSubmit={save}>
        <div key={p.updated_at}>
          <PkgForm bare p={p} />
        </div>

        <h3 style={{ marginTop: 18 }}>Sample menu</h3>
        {p.package_menu_items.map((m) => {
          const gone = delItems.includes(m.menu_item_id);
          return (
            <p
              key={m.menu_item_id}
              style={gone ? { textDecoration: 'line-through', opacity: 0.55 } : null}
            >
              <span className="muted">{m.category}</span> {m.item_name} ·{' '}
              <a
                href="#"
                style={{ textDecoration: 'none' }}
                onClick={(e) => {
                  e.preventDefault();
                  toggle(delItems, setDelItems, m.menu_item_id);
                }}
              >
                {gone ? 'Undo' : 'Remove'}
              </a>
            </p>
          );
        })}
        {newItems.map((m, i) => (
          <p key={'n' + i}>
            <span className="muted">{m.category}</span> {m.item_name}{' '}
            <span className="badge">New</span> ·{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setNewItems(newItems.filter((_, j) => j !== i));
              }}
            >
              Remove
            </a>
          </p>
        ))}
        <div className="row2">
          <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Menu category">
            {CATS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input
            value={item}
            onChange={(e) => setItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                stageItem();
              }
            }}
            placeholder="Item name"
            aria-label="Item name"
          />
        </div>
        <p className="muted small">
          Type an item and click Save changes. Press Enter to keep it in the list and type another.
        </p>

        <h3 style={{ marginTop: 18 }}>Photos</h3>
        <div className="chips">
          {p.package_photos.map((h) => {
            const gone = delPhotos.includes(h.photo_id);
            return (
              <span key={h.photo_id} style={gone ? { opacity: 0.4 } : null}>
                <img className="thumb" src={h.image_url} alt="" />
                <br />
                <small>
                  {h.caption} ·{' '}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      toggle(delPhotos, setDelPhotos, h.photo_id);
                    }}
                  >
                    {gone ? 'Undo' : 'Remove'}
                  </a>
                </small>
              </span>
            );
          })}
          {files.map((f, i) => (
            <span key={'n' + i}>
              <img className="thumb" src={previews[i]} alt="" />
              <br />
              <small>
                {type} <span className="badge">New</span> ·{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setFiles(files.filter((_, j) => j !== i));
                  }}
                >
                  Remove
                </a>
              </small>
            </span>
          ))}
        </div>
        <div className="row2">
          <input
            key={fileKey}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose photos"
            onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])}
          />
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Photo type">
            {['Food', 'Package', 'Setup'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <p className="muted small">Choose photos (max 2 MB each), then click Save changes.</p>

        <hr style={{ margin: '18px 0 14px', border: 0, borderTop: '1px solid #eadfd3' }} />
        {pending > 0 && (
          <p className="small" style={{ color: 'var(--rust)' }}>
            You have {pending} unsaved menu/photo change{pending > 1 ? 's' : ''}. Click Save changes
            to keep them.
          </p>
        )}
        <button className="btn">Save changes</button>
      </form>
    </div>
  );
}
