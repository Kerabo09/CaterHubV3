import { useEffect, useState } from 'react';
import { sb } from './supabase';
export const EVENTS = ['Birthday', 'Wedding', 'Fiesta', 'Seminar', 'Party'];
export const peso = (n) => '₱' + Number(n).toLocaleString();
export const fmt = (d) =>
  new Date(d).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
export const day = (d) =>
  new Date(d + 'T00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const ok = ({ data, error }) => {
  if (error) throw error;
  return data;
};
export const msg = (t, e) => {
  const d = document.createElement('div');
  d.className = 'toast' + (e ? ' err' : '');
  d.textContent = t;
  document.body.append(d);
  setTimeout(() => d.remove(), 3500);
};
export const run = (f) => async (e) => {
  e.preventDefault();
  const b = e.currentTarget?.querySelector?.('button:not([type=button])');
  if (b) b.disabled = true;
  try {
    await f(e);
  } catch (x) {
    msg(x.message || 'Something went wrong', 1);
  } finally {
    if (b) b.disabled = false;
  }
};
export const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp'],
  MAX_MB = 2;
export async function upload(file, uid) {
  if (!IMG_TYPES.includes(file.type)) throw new Error('Only JPG, PNG or WebP images are allowed.');
  if (file.size > MAX_MB * 1048576) throw new Error(`Image must be ${MAX_MB} MB or smaller.`);
  const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
  const { error } = await sb.storage.from('photos').upload(path, file, { contentType: file.type });
  if (error) throw error;
  return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
}
export const Badge = ({ s }) => <span className={'badge s-' + s.replace(/\s/g, '')}>{s}</span>;
export const Empty = ({ children }) => (
  <div className="wrap">
    <div className="card">{children}</div>
  </div>
);
export const gate = (s) =>
  s.err ? (
    <Empty>Something went wrong: {s.err.message}</Empty>
  ) : s.data === undefined ? (
    <Empty>Loading…</Empty>
  ) : null;
export function useLoad(fn, deps) {
  const [s, set] = useState({});
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    fn().then(
      (data) => live && set({ data }),
      (err) => live && set({ err }),
    );
    return () => {
      live = false;
    };
  }, [...deps, n]);
  return { ...s, reload: () => setN((x) => x + 1) };
}
