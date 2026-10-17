import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "./lib/supabase";

type Pin = { id: string; display_name: string | null; city: string | null; lat: number; lng: number };
const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);

export default function MemberMap() {
  const box = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState("Loading map…");

  useEffect(() => {
    if (!box.current) return;
    let alive = true;
    const map = L.map(box.current, { worldCopyJump: true }).setView([20, 10], 2);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 12,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    supabase.from("map_members").select("*").then(({ data, error }) => {
      if (!alive) return;
      if (error) { setNote("Could not load members: " + error.message); return; }
      const pins = (data ?? []) as Pin[];
      const groups = new Map<string, Pin[]>();
      for (const p of pins) {
        const k = p.lat.toFixed(2) + "," + p.lng.toFixed(2);
        groups.set(k, [...(groups.get(k) ?? []), p]);
      }
      groups.forEach((g) => {
        const names = g.map((p) => esc(p.display_name || "Member")).join("<br>");
        L.circleMarker([g[0].lat, g[0].lng], {
          radius: 7 + Math.min(g.length, 10), color: "#3730a3", fillColor: "#6366f1", fillOpacity: 0.75, weight: 2,
        })
          .bindPopup(`<b>${esc(g[0].city || "")}</b><br>${g.length} member${g.length > 1 ? "s" : ""}<br>${names}`)
          .addTo(map);
      });
      setNote(`${pins.length} member${pins.length === 1 ? "" : "s"} on the map. Pins mark the city centre, not anyone's address. Add yourself from your Profile.`);
    });
    return () => { alive = false; map.remove(); };
  }, []);

  return (
    <div className="space-y-2">
      <div ref={box} className="relative z-0 h-[60vh] w-full overflow-hidden rounded-2xl" />
      <p className="text-sm text-slate-600">{note}</p>
    </div>
  );
}
