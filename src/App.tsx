import { useEffect, useState, FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, configured } from "./lib/supabase";

const APP_NAME = "CultureConnect"; // change the name here
const CATS = ["Food","Traditions","Religion","Clothing","Language","Music","History","Everyday Life"];
type Post = { id:string; user_id:string; title:string; body:string; context:string; country:string; category:string; kind:string; image_url:string|null; created_at:string;
  profiles:{display_name:string}|null; likes:{user_id:string}[]; saves:{user_id:string}[]; comments:{id:string; body:string; profiles:{display_name:string}|null}[] };
type Ev = { id:string; name:string; country:string; category:string; starts_on:string; ends_on:string; description:string; official_url:string|null; is_sample:boolean };
type Prof = { id:string; display_name:string; bio:string; country:string|null; languages:string[]; privacy:string };
const KIND: Record<string,string> = { personal:"Personal experience", community:"Community contribution", reference:"Reference" };
const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2";
const btn = "rounded-full bg-indigo-800 px-4 py-2 font-semibold text-white disabled:opacity-50";

export default function App() {
  const [session, setSession] = useState<Session|null>(null);
  const [tab, setTab] = useState<"profile"|"community"|"map"|"events">("community");
  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!configured) return <div className="mx-auto max-w-xl p-6"><h1 className="text-2xl font-bold">{APP_NAME}</h1><p className="mt-3">Backend not connected. Copy <code>.env.example</code> to <code>.env</code> and add your Supabase URL and anon key (see README).</p></div>;
  const tabs = [["profile","Profile"],["community","Community"],["map","World Map"],["events","Events & Holidays"]] as const;
  return <div className="pb-20 md:pb-6">
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-2">
      <b className="text-xl text-indigo-800">{APP_NAME}</b>
      <nav className="hidden gap-2 md:flex">{tabs.map(([k,l]) => <button key={k} onClick={()=>setTab(k)} className={`rounded-full px-3 py-1 ${tab===k?"bg-indigo-800 text-white":""}`}>{l}</button>)}</nav>
      {session ? <button className="text-sm underline" onClick={()=>supabase.auth.signOut()}>Sign out</button> : <span className="text-sm">Signed out</span>}
    </header>
    <main className="mx-auto max-w-2xl p-4">
      {!session ? <Auth/> : tab==="community" ? <Community session={session}/> : tab==="profile" ? <Profile session={session}/> : tab==="map" ? <MapTab/> : <Events/>}
      {!session && (tab==="events"||tab==="map") && <p className="mt-4 text-sm">Sign in to browse.</p>}
    </main>
    <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t bg-white py-2 md:hidden">{tabs.map(([k,l]) => <button key={k} onClick={()=>setTab(k)} className={`px-2 text-xs ${tab===k?"font-bold text-indigo-800":""}`}>{l}</button>)}</nav>
  </div>;
}

function Auth() {
  const [mode, setMode] = useState<"in"|"up">("in"); const [msg, setMsg] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); const email = String(f.get("email")), password = String(f.get("password"));
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg("Enter a valid email address.");
    if (password.length < 8) return setMsg("Use a password of at least 8 characters.");
    const r = mode==="in" ? await supabase.auth.signInWithPassword({email,password}) : await supabase.auth.signUp({email,password});
    setMsg(r.error ? r.error.message : mode==="up" ? "Check your email to confirm your account, then sign in." : "");
  }
  return <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-5"><h2 className="text-xl font-bold">{mode==="in"?"Sign in":"Create account"}</h2>
    <input name="email" type="email" placeholder="Email" className={input} autoComplete="email"/><input name="password" type="password" placeholder="Password (8+ characters)" className={input}/>
    {msg && <p role="alert" className="text-sm text-rose-700">{msg}</p>}<button className={btn}>{mode==="in"?"Sign in":"Sign up"}</button>
    <button type="button" className="ml-3 underline" onClick={()=>setMode(mode==="in"?"up":"in")}>{mode==="in"?"Need an account?":"Have an account?"}</button>
    <p className="text-sm text-slate-600">Be respectful: no hate, no stereotypes, speak from your own experience.</p></form>;
}

function Community({ session }: { session: Session }) {
  const uid = session.user.id; const [posts, setPosts] = useState<Post[]>([]); const [blocked, setBlocked] = useState<string[]>([]);
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    const [p, b] = await Promise.all([
      supabase.from("posts").select("*, profiles!user_id(display_name), likes(user_id), saves(user_id), comments(id, body, profiles!user_id(display_name))").order("created_at",{ascending:false}).limit(50),
      supabase.from("blocks").select("blocked_id").eq("blocker_id", uid)]);
    if (p.error) setErr(p.error.message); else setPosts(p.data as unknown as Post[]);
    setBlocked((b.data ?? []).map(x => x.blocked_id)); setLoading(false);
  }
  useEffect(() => { load(); }, []);
  async function toggle(table: "likes"|"saves", p: Post) {
    const has = p[table].some(x => x.user_id===uid);
    const r = has ? await supabase.from(table).delete().match({post_id:p.id,user_id:uid}) : await supabase.from(table).insert({post_id:p.id,user_id:uid});
    if (r.error) setErr(r.error.message); else load();
  }
  async function comment(p: Post) { const body = prompt("Write a comment"); if (!body?.trim()) return; const r = await supabase.from("comments").insert({post_id:p.id,user_id:uid,body:body.trim()}); if (r.error) setErr(r.error.message); else load(); }
  async function report(p: Post) { const reason = prompt("Why are you reporting this post?"); if (!reason) return; const r = await supabase.from("reports").insert({post_id:p.id,reporter_id:uid,reason}); alert(r.error ? r.error.message : "Reported. Thank you."); }
  async function block(p: Post) { if (!confirm("Block this member?")) return; await supabase.from("blocks").insert({blocker_id:uid,blocked_id:p.user_id}); load(); }
  async function remove(p: Post) { if (confirm("Delete your post?")) { await supabase.from("posts").delete().eq("id",p.id); load(); } }
  const shown = posts.filter(p => !blocked.includes(p.user_id) && (!cat||p.category===cat) && (!q || `${p.title} ${p.body} ${p.country}`.toLowerCase().includes(q.toLowerCase())));
  return <div className="space-y-4"><Composer uid={uid} onDone={load}/>
    <div className="flex gap-2"><input className={input} placeholder="Search by keyword or country" value={q} onChange={e=>setQ(e.target.value)} aria-label="Search posts"/><select className={input+" max-w-[10rem]"} value={cat} onChange={e=>setCat(e.target.value)} aria-label="Category"><option value="">All</option>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
    {err && <p role="alert" className="text-rose-700">{err}</p>}{loading && <p>Loading…</p>}
    {!loading && !shown.length && <p className="rounded-2xl bg-white p-4">No posts yet. Be the first to share something.</p>}
    {shown.map(p => <article key={p.id} className="overflow-hidden rounded-2xl bg-white">
      {p.image_url && <img src={p.image_url} alt="" className="max-h-80 w-full object-cover"/>}
      <div className="space-y-2 p-4"><p className="text-sm text-slate-600">{p.profiles?.display_name ?? "Member"} · {p.country} · {p.category} · <span className="rounded border px-1">{KIND[p.kind]}</span></p>
        <h3 className="text-lg font-bold">{p.title}</h3><p>{p.body}</p>{p.context && <p className="border-l-4 border-amber-400 pl-2 text-sm">Context: {p.context}</p>}
        <div className="flex flex-wrap gap-3 text-sm"><button onClick={()=>toggle("likes",p)}>{p.likes.some(l=>l.user_id===uid)?"♥":"♡"} {p.likes.length}</button><button onClick={()=>comment(p)}>💬 {p.comments.length}</button>
          <button onClick={()=>navigator.clipboard?.writeText(location.href)}>↗ Share</button><button onClick={()=>toggle("saves",p)}>{p.saves.some(l=>l.user_id===uid)?"★ Saved":"☆ Save"}</button>
          <button onClick={()=>report(p)}>Report</button>{p.user_id===uid ? <button onClick={()=>remove(p)}>Delete</button> : <button onClick={()=>block(p)}>Block</button>}</div>
        {p.comments.map(c => <p key={c.id} className="text-sm text-slate-600"><b>{c.profiles?.display_name ?? "Member"}:</b> {c.body}</p>)}</div></article>)}</div>;
}

function Composer({ uid, onDone }: { uid: string; onDone: () => void }) {
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    const title = String(f.get("title")).trim(), body = String(f.get("body")).trim(), country = String(f.get("country")).trim(), file = f.get("image") as File;
    if (title.length<3) return setErr("Add a title of at least 3 characters."); if (body.length<10) return setErr("Write at least 10 characters."); if (!country) return setErr("Enter the country this relates to.");
    if (file.size>3e6) return setErr("Choose an image under 3 MB."); setBusy(true); setErr("");
    let image_url: string|null = null;
    if (file.size>0) { const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.]/g,"_")}`; const up = await supabase.storage.from("images").upload(path,file); if (up.error) { setBusy(false); return setErr(up.error.message); } image_url = supabase.storage.from("images").getPublicUrl(path).data.publicUrl; }
    const r = await supabase.from("posts").insert({user_id:uid,title,body,country,category:String(f.get("category")),context:String(f.get("context")),image_url});
    setBusy(false); if (r.error) return setErr(r.error.message); form.reset(); onDone();
  }
  return <form onSubmit={submit} className="space-y-2 rounded-2xl bg-white p-4"><h2 className="font-bold">Share something</h2>
    <input name="title" placeholder="Title" className={input} maxLength={80}/><textarea name="body" placeholder="Description" rows={3} className={input} maxLength={600}/><input name="context" placeholder="Cultural context (optional)" className={input}/>
    <div className="flex gap-2"><input name="country" placeholder="Country" className={input}/><select name="category" className={input}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
    <input name="image" type="file" accept="image/*" aria-label="Photo"/>{err && <p role="alert" className="text-sm text-rose-700">{err}</p>}<button className={btn} disabled={busy}>{busy?"Posting…":"Post"}</button></form>;
}

function Profile({ session }: { session: Session }) {
  const [p, setP] = useState<Prof|null>(null); const [msg, setMsg] = useState("");
  useEffect(() => { supabase.from("profiles").select("*").eq("id",session.user.id).single().then(r => setP(r.data as Prof)); }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); const name = String(f.get("name")).trim(); if (name.length<2) return setMsg("Enter a display name of at least 2 characters.");
    const r = await supabase.from("profiles").update({display_name:name,bio:String(f.get("bio")),country:String(f.get("country"))||null,languages:String(f.get("langs")).split(",").map(s=>s.trim()).filter(Boolean),privacy:String(f.get("privacy"))}).eq("id",session.user.id);
    setMsg(r.error ? r.error.message : "Saved.");
  }
  if (!p) return <p>Loading…</p>;
  return <form onSubmit={save} className="space-y-3 rounded-2xl bg-white p-5"><h2 className="text-xl font-bold">Your profile</h2>
    <p className="text-sm text-slate-600">Share only what you choose. Nothing is guessed from your location.</p>
    <input name="name" defaultValue={p.display_name} className={input} aria-label="Display name"/><textarea name="bio" defaultValue={p.bio} rows={3} className={input} aria-label="Bio"/>
    <input name="country" defaultValue={p.country ?? ""} placeholder="Country (optional)" className={input}/><input name="langs" defaultValue={p.languages.join(", ")} placeholder="Languages, comma separated" className={input}/>
    <select name="privacy" defaultValue={p.privacy} className={input} aria-label="Privacy"><option value="public">Public</option><option value="members">Members only</option><option value="private">Private</option></select>
    {msg && <p role="status" className="text-sm">{msg}</p>}<button className={btn}>Save changes</button></form>;
}

function MapTab() {
  const [counts, setCounts] = useState<Record<string,number>>({}); const [sel, setSel] = useState(""); const [q, setQ] = useState("");
  useEffect(() => { supabase.from("posts").select("country").then(r => { const c: Record<string,number> = {}; (r.data ?? []).forEach(x => { c[x.country] = (c[x.country]??0)+1; }); setCounts(c); }); }, []);
  const list = Object.keys(counts).filter(c => c.toLowerCase().includes(q.toLowerCase()));
  return <div className="space-y-3"><div className="rounded-2xl bg-amber-50 p-4 text-sm">The interactive world map is the next build step: add <code>react-simple-maps</code> or MapLibre and use the per-country post counts below as markers. See README.</div>
    <input className={input} placeholder="Find a country with posts" value={q} onChange={e=>setQ(e.target.value)} aria-label="Find a country"/>
    <div className="flex flex-wrap gap-2">{list.map(c => <button key={c} onClick={()=>setSel(c)} className="rounded-full border bg-white px-3 py-1">{c} ({counts[c]})</button>)}</div>
    {!list.length && <p>No countries have posts yet.</p>}{sel && <CountryPosts country={sel}/>}</div>;
}
function CountryPosts({ country }: { country: string }) {
  const [rows, setRows] = useState<{id:string;title:string;category:string}[]>([]);
  useEffect(() => { supabase.from("posts").select("id,title,category").eq("country",country).then(r => setRows(r.data ?? [])); }, [country]);
  return <div className="rounded-2xl bg-white p-4"><h3 className="font-bold">{country}</h3><p className="text-sm text-slate-600">{country} contains many regions, communities and individual ways of life. These are member posts, not a definition.</p>{rows.map(r => <p key={r.id}>{r.title} <span className="text-sm text-slate-500">({r.category})</span></p>)}</div>;
}

function Events() {
  const [ev, setEv] = useState<Ev[]>([]); const [f, setF] = useState<"all"|"now"|"up">("all"); const [loading, setLoading] = useState(true);
  useEffect(() => { supabase.from("events").select("*").order("starts_on").then(r => { setEv((r.data ?? []) as Ev[]); setLoading(false); }); }, []);
  const today = new Date().toISOString().slice(0,10); const status = (e: Ev) => today<e.starts_on ? "Upcoming" : today>e.ends_on ? "Passed" : "Happening now";
  const shown = ev.filter(e => f==="all" || (f==="now" ? status(e)==="Happening now" : status(e)==="Upcoming"));
  return <div className="space-y-3"><div className="flex gap-2">{(["all","now","up"] as const).map(k => <button key={k} onClick={()=>setF(k)} className={`rounded-full border px-3 py-1 ${f===k?"bg-slate-900 text-white":"bg-white"}`}>{k==="all"?"All":k==="now"?"Happening now":"Upcoming"}</button>)}</div>
    {loading && <p>Loading…</p>}{!loading && !shown.length && <p className="rounded-2xl bg-white p-4">No events match.</p>}
    {shown.map(e => <article key={e.id} className="rounded-2xl bg-white p-4"><p className="text-sm">{status(e)} · {e.category} · {e.country}{e.is_sample && " · Sample data, not verified"}</p><h3 className="text-lg font-bold">{e.name}</h3><p className="text-sm">{e.starts_on} to {e.ends_on}. Dates vary by year, place and lunar calendar.</p><p>{e.description}</p>{e.official_url && <a className="underline" href={e.official_url}>Official site</a>}</article>)}</div>;
}
