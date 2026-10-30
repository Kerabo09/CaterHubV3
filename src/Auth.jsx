import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sb } from './supabase';
import { useAuth } from './AuthContext';
import { run, msg } from './lib';

const Pick = ({ v, set, items }) => (
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

const Eye = ({ off }) => (
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

const Password = ({ label, ...p }) => {
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

const Shell = ({ title, sub, children, side }) => (
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

export function Signup() {
  const nav = useNavigate(),
    { refresh } = useAuth(),
    [role, setRole] = useState('Customer'),
    [err, setErr] = useState('');
  return (
    <Shell
      title="Create your account"
      sub="It only takes a minute."
      side={{
        h: 'Your next event, sorted.',
        p: 'Join CaterHub to compare Calbayog caterers and send inquiries in one place.',
        list: ['Browse packages and prices', 'Check available dates', 'Track every reply'],
      }}
    >
      <form
        onSubmit={run(async (e) => {
          const f = Object.fromEntries(new FormData(e.target));
          setErr('');
          const { data, error } = await sb.auth.signUp({
            email: f.email.trim(),
            password: f.password,
            options: { data: { name: f.name.trim(), phone: f.phone.trim(), role } },
          });
          if (error) {
            if (/registered/i.test(error.message)) {
              setErr('This email is already registered.');
              return;
            }
            throw error;
          }
          if (data.user?.identities && !data.user.identities.length) {
            setErr('This email is already registered.');
            return;
          }
          if (!data.session) {
            msg('Account created. Check your email to confirm, then log in.');
            nav('/login');
            return;
          }
          const m = await refresh();
          msg('Welcome to CaterHub!');
          nav(m?.role === 'Caterer Owner' ? '/owner/pf' : '/caterers');
        })}
      >
        <Pick
          v={role}
          set={setRole}
          items={[
            ['Customer', 'Customer', 'Find caterers and send inquiries'],
            ['Caterer Owner', 'Caterer Owner', 'Manage your catering business'],
          ]}
        />
        <label htmlFor="name">Full name</label>
        <input id="name" name="name" autoComplete="name" placeholder="Juan Dela Cruz" required />
        <div className="form2">
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          </div>
          <div>
            <label htmlFor="phone">Contact number</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="09xx xxx xxxx" required />
          </div>
        </div>
        <Password
          label="Password"
          name="password"
          minLength={6}
          autoComplete="new-password"
          placeholder="At least 6 characters"
          required
        />
        <div className="err" role="alert">{err}</div>
        <button className="btn full lg">Create account</button>
        <p className="muted small auth-foot">
          Caterer Owners set up their business profile after logging in.
        </p>
        <p className="auth-alt">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </Shell>
  );
}

export function Login() {
  const nav = useNavigate(),
    { refresh } = useAuth(),
    [role, setRole] = useState('Customer'),
    [err, setErr] = useState('');
  return (
    <Shell
      title="Welcome back"
      sub="Log in to manage your inquiries."
      side={{
        h: 'Good food starts with a good caterer.',
        p: 'Pick up where you left off: replies, dates and packages are all waiting.',
        list: ['See caterer replies', 'Manage your calendar', 'Keep all inquiries together'],
      }}
    >
      <form
        onSubmit={run(async (e) => {
          setErr('');
          const f = Object.fromEntries(new FormData(e.target));
          const { error } = await sb.auth.signInWithPassword({
            email: f.email.trim(),
            password: f.password,
          });
          if (error) {
            setErr(error.message);
            return;
          }
          const m = await refresh();
          if (!m || m.role !== role) {
            const r = m?.role;
            await sb.auth.signOut();
            await refresh();
            setErr(
              r ? `This is a ${r} account. Choose the ${r} tab.` : 'Account profile not found.',
            );
            return;
          }
          nav(m.role === 'Caterer Owner' ? '/owner' : '/caterers');
        })}
      >
        <Pick
          v={role}
          set={setRole}
          items={[
            ['Customer', 'Customer'],
            ['Caterer Owner', 'Caterer Owner'],
          ]}
        />
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        <Password
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
        <div className="auth-row">
          <div className="err" role="alert">{err}</div>
          <a
            href="#"
            className="small"
            onClick={run(async (e) => {
              const em = e.target.closest('form').email.value.trim();
              if (!em) throw new Error('Enter your email first.');
              const { error } = await sb.auth.resetPasswordForEmail(em);
              if (error) throw error;
              msg('Password reset email sent.');
            })}
          >
            Forgot password?
          </a>
        </div>
        <button className="btn full lg">Log in</button>
        <p className="auth-alt">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </Shell>
  );
}
