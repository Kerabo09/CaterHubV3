import {useState} from 'react';import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {sb} from './supabase';import {useAuth} from './AuthContext';import {EVENTS,peso,fmt,day,today,ok,run,msg,useLoad,gate,Badge,Empty} from './lib';
export function Inquire(){const{id}=useParams(),[sp]=useSearchParams(),{me}=useAuth(),nav=useNavigate();
 const s=useLoad(async()=>ok(await sb.from('caterer_profiles').select('*,catering_packages(*)').eq('caterer_id',id).maybeSingle()),[id]);
 const[pkg,setPkg]=useState(null);const g=gate(s);if(g)return g;const c=s.data;if(!c)return <Empty>Caterer not found.</Empty>;
 const ps=c.catering_packages.filter(p=>p.is_active),sel=pkg??(sp.get('pkg')||(ps[0]?String(ps[0].package_id):'')),ev=c.event_types.length?c.event_types:EVENTS;
 const Opt=({v,children})=><label className={'opt '+(sel===v?'on':'')}><input type="radio" checked={sel===v} onChange={()=>setPkg(v)}/> {children}</label>;
 return <div className="wrap"><div className="my"><form className="card" onSubmit={run(async e=>{const f=Object.fromEntries(new FormData(e.target)),n=parseInt(f.guests);
  if(f.event_date<today())throw new Error('Past dates are not accepted.');if(!(n>=1))throw new Error('Guest count must be 1 or more.');
  const p=ps.find(x=>String(x.package_id)===sel);if(p&&(n<p.min_guests||n>p.max_guests))throw new Error(`This package fits ${p.min_guests}–${p.max_guests} guests.`);
  const cu=ok(await sb.from('customers').select('customer_id').eq('user_id',me.id).maybeSingle());if(!cu)throw new Error('Customer profile not found.');
  const r=ok(await sb.from('inquiries').insert({customer_id:cu.customer_id,caterer_id:+id,package_id:p?p.package_id:null,event_date:f.event_date,event_type:f.event_type,location:f.location.trim(),guests:n,contact_phone:f.contact_phone.trim(),budget:f.budget.trim(),message:f.message.trim()}).select('ref').single());
  msg('Inquiry sent. Reference '+r.ref);nav('/my')})}>
 <h1 style={{fontSize:28}}>Send an inquiry to {c.business_name}</h1><p className="muted">Fields marked * are required. This is an inquiry, not a booking.</p><label>Package or custom inquiry *</label>
 {ps.map(p=><Opt key={p.package_id} v={String(p.package_id)}><b>{p.name}</b><br/><span className="muted small">{peso(p.price)}/head · {p.min_guests}–{p.max_guests} guests</span></Opt>)}
 <Opt v=""><b>Custom inquiry</b><br/><span className="muted small">Describe what you need below</span></Opt>
 <div className="form2"><div><label>Event date *</label><input type="date" name="event_date" min={today()} required/><span className="muted small">Past dates are not accepted.</span></div>
 <div><label>Event type *</label><select name="event_type">{ev.map(e=><option key={e}>{e}</option>)}</select></div>
 <div><label>Event location *</label><input name="location" required/></div><div><label>Guest count *</label><input type="number" name="guests" min="1" step="1" required/><span className="muted small">Whole number, 1 or more.</span></div>
 <div><label>Contact number *</label><input name="contact_phone" placeholder="09XX XXX XXXX" required/></div><div><label>Budget (optional)</label><input name="budget" placeholder="₱"/></div></div>
 <label>Special requests (optional)</label><textarea name="message" rows="3"/><br/><button className="btn">Send inquiry</button></form>
 <div><div className="card"><h3>What happens next</h3><ol className="muted"><li>You get a reference number. Status: Pending.</li><li>The caterer checks their calendar and replies.</li><li>You see the reply and status in your dashboard.</li><li>Quotation, down payment and contract are arranged directly with the caterer.</li></ol></div>
 <div className="card" style={{marginTop:16}}><h3>Service area</h3><p>Out-of-town events: {c.out_of_town?'accepted':'not accepted'}{c.note&&<><br/><span className="muted">Travel note: {c.note}</span></>}</p></div></div></div></div>}
function Detail({i,me}){const s=useLoad(async()=>ok(await sb.from('inquiry_status_history').select('*').eq('inquiry_id',i.inquiry_id).order('created_at')),[i.inquiry_id,i.status]);
 const h=s.data||[],r=[...h].reverse().find(x=>x.message&&x.changed_by!==me.id);
 return <><h3>{i.ref} · {i.caterer_profiles?.business_name}</h3>{r&&<div className="reply"><b>Caterer reply</b><br/>{r.message}</div>}<b>Status history</b>
 {h.map(x=><p className="small" key={x.status_history_id}>{x.status} · {fmt(x.created_at)}</p>)}
 {i.status==='Available'&&<p className="muted small">Available is not a booking. Finalize the quotation, down payment and contract directly with the caterer.</p>}</>}
export function My(){const{me}=useAuth(),[pick,setPick]=useState(null);
 const s=useLoad(async()=>ok(await sb.from('inquiries').select('*,caterer_profiles(business_name)').order('created_at',{ascending:false})),[]);
 const g=gate(s);if(g)return g;const d=s.data,cur=d.find(x=>x.inquiry_id===pick)||d[0];
 return <div className="wrap"><div className="my"><div className="card"><h1 style={{fontSize:28}}>My inquiries</h1>
 {d.map(i=><div className="mr" key={i.inquiry_id} onClick={()=>setPick(i.inquiry_id)}><span>{i.ref}</span><b>{i.caterer_profiles?.business_name}</b><span>{day(i.event_date)}</span><Badge s={i.status}/>
  <span>{i.status==='Pending'&&<a href="#" onClick={e=>{e.stopPropagation();run(async()=>{if(!confirm('Cancel this inquiry?'))return;ok(await sb.rpc('set_inquiry_status',{p_id:i.inquiry_id,p_status:'Cancelled',p_message:'Cancelled by customer'}).then(r=>({data:1,error:r.error})));msg('Inquiry cancelled');s.reload()})(e)}}>Cancel</a>}</span></div>)}
 {!d.length&&<p className="muted">No inquiries yet. <Link to="/caterers">Browse caterers</Link></p>}<p className="muted small">You can cancel only Pending inquiries.</p></div>
 <div className="card">{cur?<Detail i={cur} me={me}/>:<p className="muted">Select an inquiry to see its status history.</p>}</div></div></div>}
export function NotesBody(){const{me}=useAuth();
 const s=useLoad(async()=>{const d=ok(await sb.from('notifications').select('*').eq('user_id',me.id).order('created_at',{ascending:false}).limit(50));
  await sb.from('notifications').update({is_read:true}).eq('user_id',me.id).eq('is_read',false);return d},[]);
 const g=gate(s);if(g)return g;
 return <><h1 style={{fontSize:28}}>Notifications</h1><div className="card">{s.data.map(n=><p key={n.notification_id} style={{fontWeight:n.is_read?400:700}}>{n.message}<br/><span className="muted small">{fmt(n.created_at)}</span></p>)}{!s.data.length&&<p className="muted">Nothing yet.</p>}</div></>}
export const Notes=()=><div className="wrap"><NotesBody/></div>;
