import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { fetchWithAuth } from "~/utils/auth";

type Price = {
  commodity: string;
  market: string;
  priceLkrPerKg: number;
  observedOn: string;
  sourceUrl: string;
};
type Snapshot = {
  status: "LATEST_REPORT" | "PREVIOUS_REPORT" | "CACHED" | "UNAVAILABLE";
  reportDate: string | null;
  fetchedAt: string | null;
  lastCheckedAt: string | null;
  lastSuccessfulCheckAt: string | null;
  sourceUrl: string;
  warning: string | null;
  prices: Price[];
};
const INDEX = "https://www.cbsl.gov.lk/en/statistics/economic-indicators/price-report";
const input = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900";
const aliases: Record<string, string> = {
  tomato: "Tomato", tomatoes: "Tomato", beans: "Beans", bean: "Beans",
  carrot: "Carrot", carrots: "Carrot", cabbage: "Cabbage", brinjal: "Brinjal",
  eggplant: "Brinjal", pumpkin: "Pumpkin", "snake gourd": "Snake gourd",
  "green chilli": "Green Chilli", "green chili": "Green Chilli", lime: "Lime",
  "red onion": "Red Onion (Local)", "big onion": "Big Onion (Local)",
  potato: "Potato (Local)", papaya: "Papaw", papaw: "Papaw", pineapple: "Pineapple",
  "banana (sour)": "Banana (Sour)", "sour banana": "Banana (Sour)",
};
function date(value: string | null, time = false) {
  if (!value) return "Not yet";
  const d = new Date(value.length === 10 ? `${value}T12:00:00+05:30` : value);
  return Number.isNaN(d.getTime()) ? "Unknown" : new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo", day: "2-digit", month: "short", year: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit" } as const : {}),
  }).format(d);
}
function money(n: number) {
  return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(n);
}
function sourceLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "www.cbsl.gov.lk" ? url.href : INDEX;
  } catch { return INDEX; }
}
function validSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object") return false;
  const d = value as Snapshot;
  return ["LATEST_REPORT", "PREVIOUS_REPORT", "CACHED", "UNAVAILABLE"].includes(d.status)
    && Array.isArray(d.prices) && (d.prices.length === 0 || typeof d.reportDate === "string")
    && d.prices.every(p => typeof p.commodity === "string" && typeof p.market === "string"
      && Number.isFinite(Number(p.priceLkrPerKg)) && Number(p.priceLkrPerKg) > 0
      && typeof p.observedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.observedOn)
      && typeof p.sourceUrl === "string");
}

export default function OfficialMarketPrices({ cropName, variety }: { cropName?: string; variety?: string }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [commodity, setCommodity] = useState("");
  const [kg, setKg] = useState("");
  const inFlight = useRef(false);

  useEffect(() => {
    setCommodity(aliases[(cropName ?? "").trim().toLowerCase()] ?? "");
  }, [cropName, variety]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    // Each effect owns its request flag so StrictMode/remounts cannot strand loading.
    let pending = false;
    async function load() {
      if (pending) return;
      pending = true;
      inFlight.current = true;
      if (active) setLoading(true);
      try {
        const response = await fetchWithAuth("/api/harvest/official-prices", {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]), cache: "no-store",
        });
        if (!response.ok) throw new Error(`Price service returned ${response.status}.`);
        const next: unknown = await response.json();
        if (!validSnapshot(next)) throw new Error("Price response format is invalid. Deploy the matching backend update.");
        if (active) {
          setData(previous => previous?.prices.length && !next.prices.length ? previous : next);
          setError(next.prices.length === 0 ? (next.warning ?? "No saved report yet.") : "");
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to reach the price service.");
      } finally {
        pending = false;
        if (active) { setLoading(false); inFlight.current = false; }
      }
    }
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 60_000);
    const onVisible = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      inFlight.current = false;
    };
  }, [reload]);

  const commodities = useMemo(() => [...new Set((data?.prices ?? []).map(p => p.commodity))].sort(), [data]);
  const rows = useMemo(() => (data?.prices ?? []).filter(p => !commodity || p.commodity === commodity)
    .sort((a, b) => a.commodity.localeCompare(b.commodity) || a.market.localeCompare(b.market)), [data, commodity]);
  const validKg = kg.trim() !== "" && Number.isFinite(Number(kg)) && Number(kg) > 0;
  const status = error && data?.prices.length ? "Saved prices · connection unavailable"
    : data?.status === "LATEST_REPORT" ? "Today's published report"
    : data?.status === "PREVIOUS_REPORT" ? "Last available report"
    : data?.status === "CACHED" ? "Saved prices · update unavailable"
    : "Waiting for first report";

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm" aria-label="Automatic official market prices">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-emerald-100 bg-emerald-50 p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Automatic market updates</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Latest published wholesale prices</h2>
          <p className="mt-2 text-sm text-slate-600">CBSL Daily Price Report · Pettah &amp; Dambulla · LKR per kg</p>
          <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">{status}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={sourceLink(data?.sourceUrl ?? INDEX)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
            <ExternalLink size={16} /> Open source
          </a>
          <button type="button" disabled={loading} onClick={() => { if (!inFlight.current) setReload(n => n + 1); }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh display
          </button>
        </div>
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-3 text-xs text-slate-600 sm:grid-cols-3">
          <p>Latest saved report: <strong>{date(data?.reportDate ?? null)}</strong></p>
          <p>Source last checked: <strong>{date(data?.lastCheckedAt ?? null, true)}</strong></p>
          <p>Last successful check: <strong>{date(data?.lastSuccessfulCheckAt ?? null, true)}</strong></p>
        </div>
        {(error || data?.warning) && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error || data?.warning} {error && data?.prices.length ? "Previously loaded prices remain visible with their original dates." : ""}
        </p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Report commodity
            <select value={commodity} onChange={e => setCommodity(e.target.value)} className={input}>
              <option value="">All available commodities</option>
              {commodity && !commodities.includes(commodity) && <option value={commodity}>{commodity} (no saved price)</option>}
              {commodities.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Quantity for gross estimate (kg)
            <input type="number" min="0.001" step="0.001" value={kg} onChange={e => setKg(e.target.value)} placeholder="e.g. 100" className={input} />
          </label>
        </div>
        {cropName && <p className="text-xs text-slate-600">Registered crop: <strong>{cropName}{variety ? ` · ${variety}` : ""}</strong>.
          {' '}Official prices are commodity-level references, not a quote for this variety or grade. Choose the report commodity explicitly when needed.</p>}
        {loading && !data ? <p className="py-6 text-center text-sm text-slate-500">Loading official prices…</p>
          : rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No saved official price for this selection. The backend checks automatically; manual observations remain available below.</p>
          : <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
                <th className="px-4 py-3">Commodity</th><th className="px-4 py-3">Market</th><th className="px-4 py-3">Wholesale / kg</th>
                <th className="px-4 py-3">Price date</th><th className="px-4 py-3">Gross estimate</th><th className="px-4 py-3">Source</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">{rows.map(p => <tr key={`${p.commodity}|${p.market}`}>
                <td className="px-4 py-3 font-medium text-slate-900">{p.commodity}</td>
                <td className="px-4 py-3 text-slate-700">{p.market}</td>
                <td className="px-4 py-3 font-bold text-emerald-800">{money(Number(p.priceLkrPerKg))}</td>
                <td className="px-4 py-3 text-slate-600">{date(p.observedOn)}
                  {p.observedOn !== data?.reportDate && <span className="block text-xs text-amber-700">Earlier available observation</span>}
                </td>
                <td className="px-4 py-3 text-slate-700">{validKg ? money(Number(kg) * Number(p.priceLkrPerKg)) : "—"}</td>
                <td className="px-4 py-3"><a href={sourceLink(p.sourceUrl)} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">CBSL PDF</a></td>
              </tr>)}</tbody>
            </table>
          </div>}
        <p className="text-xs leading-5 text-slate-500">Source checked hourly; failed checks retry after five minutes. This page reloads saved results every minute.
          {' '}Publication dates are preserved on holidays and outages. These are published reference prices, not a real-time trading feed or guaranteed buyer offers.
          {' '}Gross estimates exclude transport, fees and losses. Missing prices are never replaced with zero.</p>
      </div>
    </section>
  );
}

