import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Place = { name: string; admin1?: string; country?: string; latitude: number; longitude: number };
const label = (p: Place) => [p.name, p.admin1, p.country].filter(Boolean).join(", ");

export default function MapSettings({ userId }: { userId: string }) {
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [picked, setPicked] = useState<Place | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("city, show_on_map").eq("id", userId).single().then(({ data }) => {
      if (data) { setSaved(data.city ?? ""); setShow(!!data.show_on_map); }
    });
  }, [userId]);

  async function search() {
    if (q.trim().length < 2) return;
    setBusy(true); setMsg("");
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=en&format=json`);
      const j = await r.json();
      setResults(j.results ?? []);
      if (!j.results?.length) setMsg("No matching city found. Try another spelling.");
    } catch { setMsg("City search isn't available right now. Please try again later."); }
    setBusy(false);
  }

  async function save() {
    setBusy(true); setMsg("");
    const update: Record<string, unknown> = { show_on_map: show };
    if (picked) {
      update.city = label(picked);
      update.lat = Math.round(picked.latitude * 100) / 100;
      update.lng = Math.round(picked.longitude * 100) / 100;
    }
    const { error } = await supabase.from("profiles").update(update).eq("id", userId);
    if (error) setMsg(error.message);
    else { if (picked) setSaved(label(picked)); setPicked(null); setMsg(show ? "Saved. You're on the map." : "Saved. You're hidden from the map."); }
    setBusy(false);
  }

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4">
      <h3 className="font-bold">Show me on the map</h3>
      <p className="text-sm text-slate-600">Only your display name and city are shown, pinned at the city centre. You can turn this off at any time.</p>
      <p className="text-sm">Your city: <b>{picked ? label(picked) : saved || "not set"}</b></p>
      <div className="flex gap-2">
        <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" placeholder="Search for your city" aria-label="City"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} />
        <button type="button" onClick={search} disabled={busy} className="rounded-full border border-slate-300 px-4">Search</button>
      </div>
      {results.length > 0 && (
        <ul className="divide-y rounded-xl border border-slate-200">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" className="w-full px-3 py-2 text-left hover:bg-slate-50"
                onClick={() => { setPicked(r); setResults([]); setQ(""); }}>{label(r)}</button>
            </li>
          ))}
        </ul>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show me on the community map
      </label>
      <button type="button" onClick={save} disabled={busy || (show && !picked && !saved)}
        className="rounded-full bg-indigo-800 px-4 py-2 font-semibold text-white disabled:opacity-50">Save map settings</button>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
    </div>
  );
}
