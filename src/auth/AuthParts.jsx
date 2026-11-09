import { useState } from 'react';
export const Pick = ({ v, set, items }) => (
  <div className="pick" role="radiogroup">
    {items.map(([k, t, d]) => (
      <label key={k} className={v === k ? 'on' : ''}>
        <input type="radio" name="role" checked={v === k} onChange={() => set(k)} />
        <i className="dot" aria-hidden="true" />
        <span>
          <b>{t}</b>
          {d && <span className="muted small pick-d">{d}</span>}
        </span>
      </label>
    ))}
  </div>
);
export const Eye = ({ off }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {off ? (
      <>
        <path d="M17.94 17.94A10.9 10.9 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);
export const Password = ({ label, ...p }) => {
  const [show, setShow] = useState(false);
  return (
    <>
      <label htmlFor={p.name}>{label}</label>
      <div className="pw">
        <input id={p.name} {...p} type={show ? 'text' : 'password'} />
        <button
          type="button"
          className="pw-t"
          onClick={() => setShow(!show)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          <Eye off={show} />
        </button>
      </div>
    </>
  );
};
export const Shell = ({ title, sub, children, side }) => (
  <div className="auth-page">
    <aside className="auth-side">
      <h2>{side.h}</h2>
      <p>{side.p}</p>
      <ul>
        {side.list.map((t) => (
          <li key={t}>
            <svg className="tick" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {t}
          </li>
        ))}
      </ul>
    </aside>
    <main className="auth-main">
      <div className="auth-box">
        <h1>{title}</h1>
        <p className="muted auth-sub">{sub}</p>
        {children}
      </div>
    </main>
  </div>
);
