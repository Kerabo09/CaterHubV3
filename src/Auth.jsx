import {useState} from 'react';import {Link,useNavigate} from 'react-router-dom';
import {sb} from './supabase';import {useAuth} from './AuthContext';import {run,msg} from './lib';
const Pick=({v,set,items})=><div className="pick">{items.map(([k,t,d])=><label key={k} className={v===k?'on':''}><input type="radio" checked={v===k} onChange={()=>set(k)}/> <b>{t}</b>{d&&<><br/><span className="muted small">{d}</span></>}</label>)}</div>;
export function Signup(){const nav=useNavigate(),{refresh}=useAuth(),[role,setRole]=useState('Customer'),[err,setErr]=useState('');
 return <div className="wrap"><form className="card auth" onSubmit={run(async e=>{const f=Object.fromEntries(new FormData(e.target));setErr('');
  const{data,error}=await sb.auth.signUp({email:f.email.trim(),password:f.password,options:{data:{name:f.name.trim(),phone:f.phone.trim(),role}}});
  if(error){if(/registered/i.test(error.message)){setErr('This email is already registered.');return}throw error}
  if(data.user?.identities&&!data.user.identities.length){setErr('This email is already registered.');return}
  if(!data.session){msg('Account created. Check your email to confirm, then log in.');nav('/login');return}
  const m=await refresh();msg('Welcome to CaterHub!');nav(m?.role==='Caterer Owner'?'/owner/pf':'/caterers')})}>
 <h1 style={{fontSize:30}}>Create an account</h1><Pick v={role} set={setRole} items={[['Customer','Customer','Find caterers and send inquiries'],['Caterer Owner','Caterer Owner','Manage one catering business']]}/>
 <label>Full name *</label><input name="name" required/><label>Email *</label><input name="email" type="email" required/><div className="err">{err}</div>
 <label>Contact number *</label><input name="phone" required/><label>Password * (min 6 characters)</label><input name="password" type="password" minLength={6} required/><br/><button className="btn full">Create account</button>
 <p className="muted small" style={{textAlign:'center'}}>Caterer Owners set up their business profile after logging in. Already registered? <Link to="/login">Log in</Link></p></form></div>}
export function Login(){const nav=useNavigate(),{refresh}=useAuth(),[role,setRole]=useState('Customer'),[err,setErr]=useState('');
 return <div className="wrap"><form className="card auth" onSubmit={run(async e=>{setErr('');const f=Object.fromEntries(new FormData(e.target));
  const{error}=await sb.auth.signInWithPassword({email:f.email.trim(),password:f.password});if(error){setErr(error.message);return}
  const m=await refresh();if(!m||m.role!==role){const r=m?.role;await sb.auth.signOut();await refresh();setErr(r?`This is a ${r} account. Choose the ${r} tab.`:'Account profile not found.');return}
  nav(m.role==='Caterer Owner'?'/owner':'/caterers')})}>
 <h1 style={{fontSize:30}}>Log in</h1><Pick v={role} set={setRole} items={[['Customer','Customer'],['Caterer Owner','Caterer Owner']]}/>
 <label>Email</label><input name="email" type="email" placeholder="you@example.com" required/><label>Password</label><input name="password" type="password" placeholder="Enter your password" required/>
 <div className="err">{err}</div><p className="small"><a href="#" onClick={run(async e=>{const em=e.target.closest('form').email.value.trim();if(!em)throw new Error('Enter your email first.');const{error}=await sb.auth.resetPasswordForEmail(em);if(error)throw error;msg('Password reset email sent.')})}>Forgot password?</a></p>
 <button className="btn full">Log in</button><p className="muted small" style={{textAlign:'center'}}>New here? <Link to="/signup">Create an account</Link> and choose Customer or Caterer Owner.</p></form></div>}
