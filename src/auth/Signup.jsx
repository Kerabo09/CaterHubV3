import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pick, Password, Shell } from './AuthParts';
import { useAuth } from '../shared/AuthContext';
import { run, msg } from '../shared/lib';
import { sb } from '../shared/supabase';
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
