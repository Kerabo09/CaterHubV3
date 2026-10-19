import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {sb} from './supabase';import {useAuth} from './AuthContext';import {EVENTS,peso,ok,useLoad,gate,Empty} from './lib';
function FilterForm({q,className,children}){const nav=useNavigate();
 const s=useLoad(async()=>[...new Set(ok(await sb.from('service_areas').select('area_name')).map(a=>a.area_name))].sort(),[]);const ar=s.data||[];
 return <form className={className} key={JSON.stringify(q)+ar.length} onSubmit={e=>{e.preventDefault();const p=new URLSearchParams();new FormData(e.target).forEach((v,k)=>{if(String(v).trim())p.set(k,String(v).trim())});nav('/caterers?'+p)}}>
 <div><label>Business name</label><input name="name" defaultValue={q.name||''} placeholder="Search by name"/></div>
 <div><label>Location</label><select name="area" defaultValue={q.area||''}><option value="">Any area</option>{ar.map(a=><option key={a}>{a}</option>)}</select></div>
 <div><label>Event type</label><select name="event" defaultValue={q.event||''}><option value="">Any event</option>{EVENTS.map(a=><option key={a}>{a}</option>)}</select></div>
 <div><label>Guests</label><input name="guests" type="number" min="1" defaultValue={q.guests||''} placeholder="Number"/></div>
 <div><label>Budget per head</label><input name="budget" defaultValue={q.budget||''} placeholder="₱ min – max"/></div>{children}</form>}
const Chips=({l})=><div className="chips">{l.map(e=><span className="chip" key={e}>{e}</span>)}</div>;
export function Home(){return <section className="wrap"><div className="hero"><span className="eyebrow">Calbayog catering directory</span><h1>Find a caterer in <em>Calbayog</em>. Send an inquiry.</h1><p>Browse caterers, compare packages and check dates. Payments and contracts are arranged directly with the caterer.</p></div>
 <FilterForm q={{}} className="card search"><button className="btn">Search</button></FilterForm>
 <h2>How it works</h2><div className="grid3"><div className="card"><h3>Browse and filter</h3><p className="muted">Search by name, location, event type, guest count and budget. No account needed.</p></div>
 <div className="card"><h3>Send an inquiry</h3><p className="muted">Log in, choose a package or custom inquiry, and enter your event details.</p></div>
 <div className="card"><h3>Track the reply</h3><p className="muted">The caterer checks their calendar and replies. You see the status in your dashboard.</p></div></div>
 <h2>Browse by event type</h2><div className="chips">{EVENTS.map(e=><Link key={e} className="chip" to={'/caterers?event='+e}>{e}</Link>)}</div>
 <p className="muted small" style={{marginTop:28}}>CaterHub is for discovery and inquiries only. It does not process payments or confirm bookings.</p></section>}
export function List(){const[sp]=useSearchParams();const q=Object.fromEntries(sp);
 const s=useLoad(async()=>ok(await sb.from('caterer_profiles').select('*,service_areas(area_name),catering_packages(price,is_active)').eq('status','Published').order('business_name')),[]);
 const g=gate(s);if(g)return g;
 let[a,b]=(q.budget||'').split(/[-–]/).map(x=>parseFloat(x.replace(/[^\d.]/g,'')));if(b===undefined){b=a;a=NaN}const n=parseInt(q.guests);
 const rows=s.data.filter(c=>{const ps=c.catering_packages.filter(p=>p.is_active).map(p=>+p.price),mn=ps.length?Math.min(...ps):null;
  return(!q.name||c.business_name.toLowerCase().includes(q.name.toLowerCase()))&&(!q.area||c.service_areas.some(x=>x.area_name===q.area))&&(!q.event||c.event_types.includes(q.event))
  &&(!n||(n>=c.min_guests&&n<=c.max_guests))&&(isNaN(a)||(mn!==null&&mn>=a))&&(isNaN(b)||(mn!==null&&mn<=b))});
 return <div className="wrap"><h1 style={{fontSize:32}}>Caterers</h1><p className="muted">Showing {rows.length} active caterer{rows.length===1?'':'s'}</p>
 <div className="two"><FilterForm q={q} className="card"><br/><button className="btn full">Apply filters</button><p style={{textAlign:'center'}}><Link to="/caterers">Clear all</Link></p></FilterForm>
 <div className="cats">{rows.map(c=>{const ps=c.catering_packages.filter(p=>p.is_active).map(p=>+p.price);
  return <div className="card cat" style={{padding:0}} key={c.caterer_id}><div className="ph">{c.logo?<img src={c.logo} alt=""/>:'Photo'}</div><div className="pad"><h3>{c.business_name}</h3>
  <p className="muted small">{c.service_areas.map(x=>x.area_name).join(', ')||'Calbayog City'} · {c.out_of_town?'Out-of-town accepted':'Local events only'}</p><Chips l={c.event_types}/>
  <p>{c.min_guests}–{c.max_guests} guests{ps.length>0&&<> · from <b>{peso(Math.min(...ps))}/head</b></>}</p><Link className="btn" to={'/caterer/'+c.caterer_id}>View profile</Link></div></div>})}
  {!rows.length&&<div className="card">No caterers match your filters.</div>}</div></div></div>}
export function Profile(){const{id}=useParams(),{me}=useAuth();
 const s=useLoad(async()=>ok(await sb.from('caterer_profiles').select('*,service_areas(area_name),catering_packages(*,package_photos(image_url))').eq('caterer_id',id).maybeSingle()),[id]);
 const g=gate(s);if(g)return g;const c=s.data;if(!c)return <Empty>Caterer not found.</Empty>;
 const ps=c.catering_packages.filter(p=>p.is_active),ph=[c.logo,...ps.flatMap(p=>p.package_photos.map(x=>x.image_url))].filter(Boolean).slice(0,5);
 return <div className="wrap"><p className="muted small"><Link to="/caterers">Caterers</Link> / {c.business_name}</p>
 <div className="gal">{[0,1,2,3,4].map(i=><div className="ph" key={i}>{ph[i]?<img src={ph[i]} alt=""/>:'Photo'}</div>)}</div>
 <div className="prof"><div><h1 style={{fontSize:34}}>{c.business_name}</h1><Chips l={c.event_types}/><p>{c.description}</p>
 <div className="card"><p><b>Capacity:</b> {c.min_guests}–{c.max_guests} guests<br/><b>Service areas:</b> {c.service_areas.map(x=>x.area_name).join(', ')||'—'}<br/><b>Out-of-town events:</b> {c.out_of_town?'Accepted':'Not accepted'}{c.note&&<><br/><b>Travel note:</b> {c.note}</>}</p></div>
 <h2>Packages</h2><div className="card">{ps.map(p=><div className="pk" key={p.package_id}><div><b>{p.name}</b><br/><span className="muted small">{p.min_guests}–{p.max_guests} guests{p.is_customizable?' · Customizable':''}</span></div><div><b>{peso(p.price)}/head</b> <Link to={'/package/'+p.package_id}>View details</Link></div></div>)}{!ps.length&&<p className="muted">No packages yet.</p>}</div></div>
 <div><div className="card"><h3>Send an inquiry</h3>
 {!me?<><p className="muted">Log in to send an inquiry to this caterer. Guests can browse only.</p><Link className="btn full" to="/login">Log in to continue</Link></>
 :me.role==='Customer'?<><p className="muted">Send your event details to this caterer.</p><Link className="btn full" to={'/inquire/'+id}>Send an inquiry</Link></>:<p className="muted">Caterer accounts cannot send inquiries.</p>}
 <hr style={{border:0,borderTop:'1px solid var(--line)'}}/><p><b>Contact:</b> {c.contact_number||'—'}</p><p className="muted small">Reserved or Unavailable dates cannot be accepted. The caterer confirms availability when replying.</p></div></div></div></div>}
export function Pkg(){const{id}=useParams(),{me}=useAuth();
 const s=useLoad(async()=>ok(await sb.from('catering_packages').select('*,caterer_profiles(caterer_id,business_name),package_menu_items(*),package_photos(image_url)').eq('package_id',id).maybeSingle()),[id]);
 const g=gate(s);if(g)return g;const p=s.data;if(!p)return <Empty>Package not found.</Empty>;const c=p.caterer_profiles;
 return <div className="wrap"><p className="muted small"><Link to="/caterers">Caterers</Link> / <Link to={'/caterer/'+c.caterer_id}>{c.business_name}</Link> / {p.name}</p>
 <div className="gal">{[0,1,2].map(i=><div className="ph" key={i}>{p.package_photos[i]?<img src={p.package_photos[i].image_url} alt=""/>:'Photo'}</div>)}</div>
 <div className="prof"><div><h1 style={{fontSize:34}}>{p.name}</h1><p>{p.description}</p><div className="cats">
 <div className="card"><h3>Inclusions</h3><ul>{p.inclusions.map(i=><li key={i}>{i}</li>)}{!p.inclusions.length&&<li className="muted">None listed</li>}</ul></div>
 <div className="card"><h3>Sample menu</h3>{p.package_menu_items.map(m=><p key={m.menu_item_id}><span className="muted">{m.category}</span> {m.item_name}</p>)}{!p.package_menu_items.length&&<p className="muted">Not listed</p>}</div></div></div>
 <div className="card"><h2 style={{margin:0}}>{peso(p.price)}/head</h2><p><b>Capacity:</b> {p.min_guests}–{p.max_guests} guests<br/><b>Customizable:</b> {p.is_customizable?'Yes':'No'}<br/><b>Tables and chairs:</b> {p.tables_chairs}</p>
 {!me?<Link className="btn full" to="/login">Log in to inquire</Link>:me.role==='Customer'&&<Link className="btn full" to={`/inquire/${c.caterer_id}?pkg=${id}`}>Inquire about this package</Link>}
 <p className="muted small">This sends an inquiry only. It is not a booking.</p></div></div></div>}
