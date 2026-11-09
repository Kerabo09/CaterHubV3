import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pick, Password, Shell } from './AuthParts';
import { useAuth } from '../shared/AuthContext';
import { run, msg } from '../shared/lib';
import { sb } from '../shared/supabase';
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
