import React, { useState, useMemo, useEffect, useRef } from "react";
import { TR_VIEWBOX, TR_PROVINCES } from "./trProvinces";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

/* ------------------------------------------------------------------ *
 *  BACKEND ADRESİ
 *  Yerelde test:  http://localhost:8000
 *  Vercel'e alınca kendi backend URL'inle değiştir
 *  (ör. https://api.senindomain.com). Vite kullanıyorsan
 *  import.meta.env.VITE_API_URL da okuyabilirsin.
 * ------------------------------------------------------------------ */
const API = "https://turkiye-elektrik-panosu-v2.onrender.com";

/* --- Yedek (demo) veri: backend'e ulaşılamazsa gösterilir --- */
const DEMO_SOURCES = [
  { key: "gunes",      name: "Güneş",            mw: 25800, color: "#FBBF24", renewable: true  },
  { key: "dogalgaz",   name: "Doğal Gaz",        mw: 25300, color: "#F97316", renewable: false },
  { key: "barajli",    name: "Barajlı Hidro",    mw: 23900, color: "#3B82F6", renewable: true  },
  { key: "ruzgar",     name: "Rüzgar",           mw: 14785, color: "#2DD4BF", renewable: true  },
  { key: "linyit",     name: "Yerli Kömür",      mw: 11400, color: "#B45309", renewable: false },
  { key: "ithalKomur", name: "İthal Kömür",      mw: 10200, color: "#64748B", renewable: false },
  { key: "akarsu",     name: "Akarsu Hidro",     mw:  8396, color: "#38BDF8", renewable: true  },
  { key: "biyokutle",  name: "Biyokütle",        mw:  2122, color: "#84CC16", renewable: true  },
  { key: "jeotermal",  name: "Jeotermal",        mw:  1751, color: "#EC4899", renewable: true  },
  { key: "diger",      name: "Fuel Oil / Diğer", mw:   500, color: "#94A3B8", renewable: false },
];

const DEMO_HIST = [
  { year: "2015", toplam: 73147, gunes: 249, ruzgar: 4503, hidro: 25868, dogalgaz: 21000, linyit: 8900, ithalKomur: 6100, jeotermal: 624, biyokutle: 367, diger: 5536 },
  { year: "2016", toplam: 78497, gunes: 833, ruzgar: 5751, hidro: 26681, dogalgaz: 23000, linyit: 9800, ithalKomur: 6700, jeotermal: 821, biyokutle: 467, diger: 4444 },
  { year: "2017", toplam: 85200, gunes: 3421, ruzgar: 6516, hidro: 27273, dogalgaz: 25845, linyit: 10200, ithalKomur: 7000, jeotermal: 1064, biyokutle: 634, diger: 3247 },
  { year: "2018", toplam: 88551, gunes: 5063, ruzgar: 7005, hidro: 28291, dogalgaz: 26802, linyit: 9900, ithalKomur: 7000, jeotermal: 1283, biyokutle: 862, diger: 2345 },
  { year: "2019", toplam: 91267, gunes: 5995, ruzgar: 7591, hidro: 28503, dogalgaz: 25843, linyit: 10200, ithalKomur: 8600, jeotermal: 1515, biyokutle: 1163, diger: 1857 },
  { year: "2020", toplam: 95891, gunes: 6668, ruzgar: 8832, hidro: 30984, dogalgaz: 25333, linyit: 10600, ithalKomur: 8900, jeotermal: 1613, biyokutle: 1390, diger: 1571 },
  { year: "2021", toplam: 99820, gunes: 7816, ruzgar: 10585, hidro: 31506, dogalgaz: 25333, linyit: 10300, ithalKomur: 9550, jeotermal: 1676, biyokutle: 1642, diger: 1412 },
  { year: "2022", toplam: 103809, gunes: 9425, ruzgar: 11396, hidro: 31571, dogalgaz: 25400, linyit: 10600, ithalKomur: 9295, jeotermal: 1691, biyokutle: 1868, diger: 2563 },
  { year: "2023", toplam: 106672, gunes: 11281, ruzgar: 11718, hidro: 31964, dogalgaz: 25400, linyit: 9800, ithalKomur: 8396, jeotermal: 1692, biyokutle: 1950, diger: 4471 },
  { year: "2024", toplam: 115802, gunes: 19533, ruzgar: 12863, hidro: 32203, dogalgaz: 25400, linyit: 10234, ithalKomur: 10200, jeotermal: 1733, biyokutle: 2016, diger: 1620 },
  { year: "2025", toplam: 123167, gunes: 25800, ruzgar: 14785, hidro: 32296, dogalgaz: 25300, linyit: 10700, ithalKomur: 10200, jeotermal: 1751, biyokutle: 2122, diger: 213 },
];

// Tarihsel grafikte secilebilir kaynaklar (renk + ad)
const HIST_SOURCES = [
  { key: "gunes",      name: "Güneş",       color: "#FBBF24" },
  { key: "ruzgar",     name: "Rüzgar",      color: "#2DD4BF" },
  { key: "hidro",      name: "Hidrolik",    color: "#3B82F6" },
  { key: "dogalgaz",   name: "Doğal Gaz",   color: "#F97316" },
  { key: "linyit",     name: "Yerli Kömür", color: "#B45309" },
  { key: "ithalKomur", name: "İthal Kömür", color: "#64748B" },
  { key: "jeotermal",  name: "Jeotermal",   color: "#EC4899" },
  { key: "biyokutle",  name: "Biyokütle",   color: "#84CC16" },
  { key: "diger",      name: "Diğer",       color: "#94A3B8" },
];

const GENMIX = [
  { name: "Kömür",     value: 33.0, color: "#64748B" },
  { name: "Doğal Gaz", value: 22.8, color: "#F97316" },
  { name: "Hidrolik",  value: 16.2, color: "#3B82F6" },
  { name: "Güneş",     value: 11.5, color: "#FBBF24" },
  { name: "Rüzgar",    value: 10.6, color: "#2DD4BF" },
  { name: "Jeotermal", value:  3.3, color: "#EC4899" },
  { name: "Biyokütle", value:  2.6, color: "#84CC16" },
];

const COLOR = Object.fromEntries(DEMO_SOURCES.map((s) => [s.key, s.color]));
const NAME = Object.fromEntries(DEMO_SOURCES.map((s) => [s.key, s.name]));

function buildDemoDay() {
  const demand = [0.72,0.68,0.65,0.63,0.63,0.66,0.72,0.80,0.86,0.90,0.93,0.95,
                  0.94,0.93,0.92,0.93,0.95,0.98,1.00,0.99,0.95,0.89,0.82,0.76];
  const solarF = [0,0,0,0,0,0.02,0.08,0.20,0.38,0.55,0.68,0.75,
                  0.78,0.75,0.66,0.52,0.36,0.20,0.07,0.01,0,0,0,0];
  const windF  = [0.42,0.45,0.48,0.50,0.47,0.43,0.38,0.34,0.30,0.28,0.26,0.25,
                  0.27,0.30,0.33,0.36,0.40,0.44,0.48,0.52,0.55,0.53,0.49,0.45];
  return Array.from({ length: 24 }, (_, h) => {
    const d = demand[h];
    const row = {
      saat: `${String(h).padStart(2, "0")}:00`,
      gunes: Math.round(25800*solarF[h]), ruzgar: Math.round(14785*windF[h]),
      barajli: Math.round(2600+6200*d), akarsu: Math.round(1400+2600*d),
      dogalgaz: Math.round(3000+11000*d), linyit: Math.round(8000+900*d),
      ithalKomur: Math.round(7800+800*d), jeotermal: 1420, biyokutle: 1550, diger: 210,
    };
    row.toplam = Object.keys(row).filter((k) => k !== "saat")
      .reduce((s, k) => s + row[k], 0);
    return row;
  });
}

const fmt = (n) => Math.round(n || 0).toLocaleString("tr-TR");
const stamp = () => {
  const d = new Date();
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }) +
    " · " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
};

const AREA_KEYS = ["ithalKomur","linyit","dogalgaz","barajli","akarsu",
                   "jeotermal","biyokutle","ruzgar","gunes"];

/* --- yardımcı bileşenler --- */
function ChartTooltip({ active, payload, label, unit = "MW" }) {
  if (!active || !payload || !payload.length) return null;
  const rows = [...payload].reverse().filter((p) => p.value > 0);
  return (
    <div className="tt">
      <div className="tt-h">{label}</div>
      {rows.map((p) => (
        <div className="tt-r" key={p.dataKey}>
          <span className="tt-dot" style={{ background: p.color || p.fill }} />
          <span className="tt-n">{p.name}</span>
          <span className="tt-v">{fmt(p.value)} {unit}</span>
        </div>
      ))}
    </div>
  );
}

function Kpi({ label, value, unit, sub, accent }) {
  return (
    <div className="kpi" style={{ "--acc": accent }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-val">{value}<span className="kpi-unit">{unit}</span></div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

function HedefBar({ pct }) {
  if (pct === null || pct === undefined) return null;
  const clamped = Math.max(0, Math.min(100, pct));
  const color = pct >= 100 ? "#84CC16" : pct >= 50 ? "#38BDF8" : pct >= 0 ? "#FBBF24" : "#F87171";
  return (
    <div className="hedef-bar-track">
      <div className="hedef-bar-fill" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}

function fmtHedef(n) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

// Il ismi normalizasyonu: GeoJSON (Baslik Harf, Turkce) <-> EPDK/EPIAS (BUYUK HARF)
const IL_ALIAS = { "AFYON": "AFYONKARAHİSAR", "İÇEL": "MERSİN" };
const normIl = (s) => (s || "").toLocaleUpperCase("tr-TR").trim();
const ilKarsilik = (geoAdi, illerObj) => {
  const n = normIl(geoAdi);
  if (illerObj[n]) return illerObj[n];
  if (IL_ALIAS[n] && illerObj[IL_ALIAS[n]]) return illerObj[IL_ALIAS[n]];
  const rev = Object.entries(IL_ALIAS).find(([, v]) => v === n);
  if (rev && illerObj[rev[0]]) return illerObj[rev[0]];
  return null;
};

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Bir rengi, koyu lacivert zeminden (deger/maks oranina gore) o rengin tam tonuna dogru karistir
function tonlaRenk(hex, t) {
  const [br, bg, bb] = [30, 41, 59]; // taban (koyu lacivert)
  const [tr, tg, tb] = hexToRgb(hex);
  const k = Math.max(0.12, Math.min(1, t)); // en dusuk deger bile hafifce gorunsun
  const r = Math.round(br + k * (tr - br));
  const g = Math.round(bg + k * (tg - bg));
  const b = Math.round(bb + k * (tb - bb));
  return `rgb(${r},${g},${b})`;
}

// Doluluk yuzdesi icin renk skalasi: %0 kirmizi -> %50 sari -> %100 mavi
function dolulukRengi(pct) {
  if (pct === null || pct === undefined) return "#1E293B";
  const t = Math.max(0, Math.min(100, pct)) / 100;
  const KIRMIZI = [239, 68, 68], SARI = [251, 191, 36], MAVI = [59, 130, 246];
  const [a, b] = t < 0.5 ? [KIRMIZI, SARI] : [SARI, MAVI];
  const k = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const r = Math.round(a[0] + k * (b[0] - a[0]));
  const g = Math.round(a[1] + k * (b[1] - a[1]));
  const bl = Math.round(a[2] + k * (b[2] - a[2]));
  return `rgb(${r},${g},${bl})`;
}

/* ------------------------------------------------------------------ */
function App() {
  const urlParams = useMemo(
    () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams()),
    []
  );
  const urlHadYearRange = useRef(!!(urlParams.get("yf") || urlParams.get("yt")));
  const urlHadUYearRange = useRef(!!(urlParams.get("uyf") || urlParams.get("uyt")));
  const [copied, setCopied] = useState(false);

  const [tab, setTab] = useState(urlParams.get("tab") || "genel");
  const [now, setNow] = useState(stamp());
  const [sources, setSources] = useState(DEMO_SOURCES);
  const [day, setDay] = useState(buildDemoDay);
  const [hist, setHist] = useState(DEMO_HIST);
  const [histSel, setHistSel] = useState(
    urlParams.get("hsel") ? urlParams.get("hsel").split(",") : HIST_SOURCES.map((s) => s.key)
  );
  const [uretimHist, setUretimHist] = useState([]);
  const [uretimSel, setUretimSel] = useState(
    urlParams.get("usel") ? urlParams.get("usel").split(",") : HIST_SOURCES.map((s) => s.key)
  );
  const [uYearFrom, setUYearFrom] = useState(urlParams.get("uyf") || null);
  const [uYearTo, setUYearTo] = useState(urlParams.get("uyt") || null);
  const [uretimMode, setUretimMode] = useState(urlParams.get("umode") || "mutlak"); // "mutlak" | "yuzde"
  const [yearFrom, setYearFrom] = useState(urlParams.get("yf") || DEMO_HIST[0].year);
  const [yearTo, setYearTo] = useState(urlParams.get("yt") || DEMO_HIST[DEMO_HIST.length - 1].year);
  const [live, setLive] = useState(false);
  const [fiyat, setFiyat] = useState([]);
  const [weekFiyat, setWeekFiyat] = useState([]);
  const [weekUretim, setWeekUretim] = useState([]);
  const [hedefler, setHedefler] = useState(null);
  const [baraj, setBaraj] = useState(null);
  const [asOf, setAsOf] = useState("2025-12");

  useEffect(() => {
    const t = setInterval(() => setNow(stamp()), 30000);
    return () => clearInterval(t);
  }, []);

  // backend'den canlı veri çek — her uç kendi geldigi anda ekrana yansir
  // (en yavas istek, zaten gelmis olan digerlerini bekletmesin diye)
  useEffect(() => {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 45000);
    const j = (p) => fetch(`${API}${p}`, { signal: ac.signal }).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status); return r.json();
    });
    const today = new Date();
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const iso = (d) => d.toISOString().slice(0, 10);

    let herhangiBiriGeldi = false;
    const basarisizlar = [];
    const geldi = () => { herhangiBiriGeldi = true; setLive(true); };

    const pKurulu = j("/api/kurulu-guc").then((v) => {
      if (v?.kaynaklar?.length) { setSources(v.kaynaklar); setAsOf(v.as_of); geldi(); }
    }).catch((e) => basarisizlar.push("kurulu-guc: " + e.message));

    const pUretim = j("/api/uretim").then((v) => {
      if (Array.isArray(v) && v.length) { setDay(v); geldi(); }
    }).catch((e) => basarisizlar.push("uretim: " + e.message));

    j("/api/tarihsel").then((v) => {
      if (Array.isArray(v) && v.length) {
        setHist(v);
        if (!urlHadYearRange.current) {
          setYearFrom(v[0].year);
          setYearTo(v[v.length - 1].year);
        }
      }
    }).catch((e) => basarisizlar.push("tarihsel: " + e.message));

    j("/api/uretim-tarihsel").then((v) => {
      if (Array.isArray(v) && v.length) {
        setUretimHist(v);
        if (!urlHadUYearRange.current) {
          setUYearFrom(v[0].year);
          const fullYears = v.filter((r) => r.ay_sayisi === 12);
          const lastDefault = fullYears.length ? fullYears[fullYears.length - 1] : v[v.length - 1];
          setUYearTo(lastDefault.year);
        }
      }
    }).catch((e) => basarisizlar.push("uretim-tarihsel: " + e.message));

    j("/api/fiyatlar").then((v) => {
      if (Array.isArray(v) && v.length) setFiyat(v);
    }).catch((e) => basarisizlar.push("fiyatlar: " + e.message));

    j("/api/hedefler").then((v) => {
      if (v?.gostergeler?.length) setHedefler(v);
    }).catch((e) => basarisizlar.push("hedefler: " + e.message));

    j("/api/baraj-doluluk").then((v) => {
      if (v?.iller) setBaraj(v);
    }).catch((e) => basarisizlar.push("baraj-doluluk: " + e.message));

    j(`/api/fiyatlar?start=${iso(weekAgo)}&end=${iso(today)}`).then((v) => {
      if (Array.isArray(v) && v.length) setWeekFiyat(v);
    }).catch((e) => basarisizlar.push("fiyatlar(hafta): " + e.message));

    j(`/api/uretim?start=${iso(weekAgo)}&end=${iso(today)}`).then((v) => {
      if (Array.isArray(v) && v.length) setWeekUretim(v);
    }).catch((e) => basarisizlar.push("uretim(hafta): " + e.message));

    // hepsi bitince, hicbiri basarili olmadiysa hata goster
    Promise.allSettled([pKurulu, pUretim]).finally(() => {
      if (!herhangiBiriGeldi && typeof window !== "undefined" && window.showError) {
        window.showError("Backend'e baglanilamadi (" + API + "): " + (basarisizlar.join(" | ") || "bilinmeyen sebep"));
      }
    });

    return () => { clearTimeout(to); ac.abort(); };
  }, []);

  // URL'yi mevcut secimlerle senkron tut (paylasilabilir baglanti)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams();
    p.set("tab", tab);
    if (yearFrom) p.set("yf", yearFrom);
    if (yearTo) p.set("yt", yearTo);
    if (histSel.length) p.set("hsel", histSel.join(","));
    if (uYearFrom) p.set("uyf", uYearFrom);
    if (uYearTo) p.set("uyt", uYearTo);
    if (uretimSel.length) p.set("usel", uretimSel.join(","));
    p.set("umode", uretimMode);
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
  }, [tab, yearFrom, yearTo, histSel, uYearFrom, uYearTo, uretimSel, uretimMode]);

  const kopyalaBaglanti = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const total = useMemo(() => sources.reduce((s, x) => s + x.mw, 0), [sources]);
  const renew = useMemo(
    () => sources.filter((x) => x.renewable).reduce((s, x) => s + x.mw, 0), [sources]);
  const renewPct = ((renew / total) * 100).toFixed(1);
  const mwOf = (k) => sources.find((s) => s.key === k)?.mw || 0;
  const colorOf = (k) => sources.find((s) => s.key === k)?.color || COLOR[k] || "#888";
  const nameOf = (k) => sources.find((s) => s.key === k)?.name || NAME[k] || k;

  const cur = day[day.length - 1] || day[0];
  const curFiyat = fiyat[fiyat.length - 1];
  const fiyatOrt = fiyat.length
    ? Math.round((fiyat.reduce((s, r) => s + r.ptf, 0) / fiyat.length) * 100) / 100
    : null;
  const fiyatMin = fiyat.length ? fiyat.reduce((a, b) => (a.ptf < b.ptf ? a : b)) : null;
  const fiyatMax = fiyat.length ? fiyat.reduce((a, b) => (a.ptf > b.ptf ? a : b)) : null;
  const uretim = cur.toplam;
  const tuketim = Math.round(uretim * 0.986);
  const sorted = useMemo(() => [...sources].sort((a, b) => b.mw - a.mw), [sources]);

  const barajIller = baraj?.iller || {};
  const ilDoluluk = (il) => {
    const rec = ilKarsilik(il, barajIller);
    return rec ? rec.doluluk : null;
  };

  const insights = useMemo(() => {
    const list = [];
    if (fiyat.length && weekFiyat.length) {
      const bugunOrt = fiyat.reduce((s, r) => s + r.ptf, 0) / fiyat.length;
      const haftaOrt = weekFiyat.reduce((s, r) => s + r.ptf, 0) / weekFiyat.length;
      if (haftaOrt > 0) {
        const fark = ((bugunOrt - haftaOrt) / haftaOrt) * 100;
        if (Math.abs(fark) >= 3) {
          list.push({
            renk: fark > 0 ? "#F97316" : "#84CC16",
            metin: `Bugünün ortalama PTF'si (${fmt(bugunOrt)} TL/MWh), son 7 günün ortalamasına göre %${fmt(Math.abs(fark))} ${fark > 0 ? "daha yüksek" : "daha düşük"}.`,
          });
        }
      }
    }
    if (day.length && weekUretim.length) {
      const renewSum = (rows) => rows.reduce((s, r) => s + (r.gunes + r.ruzgar + r.barajli + r.akarsu + r.jeotermal + r.biyokutle), 0);
      const totalSum = (rows) => rows.reduce((s, r) => s + r.toplam, 0);
      const bugunPay = totalSum(day) ? (renewSum(day) / totalSum(day)) * 100 : null;
      const haftaPay = totalSum(weekUretim) ? (renewSum(weekUretim) / totalSum(weekUretim)) * 100 : null;
      if (bugunPay != null && haftaPay != null) {
        const fark = bugunPay - haftaPay;
        if (Math.abs(fark) >= 1) {
          list.push({
            renk: fark > 0 ? "#84CC16" : "#F97316",
            metin: `Bugün yenilenebilir kaynakların üretimdeki payı %${fmt(bugunPay)}, haftalık ortalama olan %${fmt(haftaPay)}'${fark > 0 ? "in üzerinde" : "in altında"}.`,
          });
        }
      }
    }
    const gunesMW = sources.find((s) => s.key === "gunes")?.mw;
    if (gunesMW && day.length && weekUretim.length) {
      const bugunKF = (day.reduce((s, r) => s + r.gunes, 0) / (gunesMW * day.length)) * 100;
      const haftaKF = (weekUretim.reduce((s, r) => s + r.gunes, 0) / (gunesMW * weekUretim.length)) * 100;
      const fark = bugunKF - haftaKF;
      if (Math.abs(fark) >= 3) {
        list.push({
          renk: fark > 0 ? "#FBBF24" : "#94A3B8",
          metin: `Güneş kapasite kullanım oranı bugün %${fmt(bugunKF)}, haftalık ortalama %${fmt(haftaKF)}'${fark > 0 ? "in üzerinde" : "in altında"}.`,
        });
      }
    }
    const ruzgarMW = sources.find((s) => s.key === "ruzgar")?.mw;
    if (ruzgarMW && day.length && weekUretim.length) {
      const bugunKF = (day.reduce((s, r) => s + r.ruzgar, 0) / (ruzgarMW * day.length)) * 100;
      const haftaKF = (weekUretim.reduce((s, r) => s + r.ruzgar, 0) / (ruzgarMW * weekUretim.length)) * 100;
      const fark = bugunKF - haftaKF;
      if (Math.abs(fark) >= 5) {
        list.push({
          renk: fark > 0 ? "#2DD4BF" : "#94A3B8",
          metin: `Rüzgar kapasite kullanım oranı bugün %${fmt(bugunKF)}, haftalık ortalama %${fmt(haftaKF)}'${fark > 0 ? "in üzerinde" : "in altında"}.`,
        });
      }
    }
    return list;
  }, [fiyat, weekFiyat, day, weekUretim, sources]);
  const histYears = hist.map((h) => h.year);
  const histView = hist.filter((h) => h.year >= yearFrom && h.year <= yearTo);
  const uretimYears = uretimHist.map((h) => h.year);
  const uretimView = uretimHist.filter((h) => h.year >= (uYearFrom || "0") && h.year <= (uYearTo || "9999"));
  const uretimViewData = uretimMode === "yuzde"
    ? uretimView.map((row) => {
        const out = { year: row.year, toplam: row.toplam };
        HIST_SOURCES.forEach((s) => {
          out[s.key] = row.toplam ? Math.round((row[s.key] / row.toplam) * 1000) / 10 : 0;
        });
        return out;
      })
    : uretimView;

  const TABS = [["genel","Genel Bakış"],["kurulu","Kurulu Güç"],
                ["uretim","Üretim"],["fiyat","Fiyatlar"],["hedef","Hedefler"],
                ["harita","Barajlar Su Durumu"],["tarih","Tarihsel"]];

  return (
    <div className="root">
      <style>{CSS}</style>

      <header className="hd">
        <div className="hd-line" />
        <div className="hd-in">
          <div>
            <div className="hd-eyebrow">TEİAŞ YTBS · EPİAŞ Şeffaflık Platformu</div>
            <h1 className="hd-title">Türkiye Elektrik İzleme Panosu</h1>
            <p className="hd-desc">Kurulu güç ve elektrik üretimi — tarihsel ve güncel görünüm</p>
          </div>
          <div className="hd-live">
            <span className={"live" + (live ? "" : " demo")}>
              <span className="live-dot" />{live ? "Canlı" : "Demo veri"}
            </span>
            <button className="share-btn" onClick={kopyalaBaglanti}>
              {copied ? "Kopyalandı ✓" : "Bağlantıyı Kopyala"}
            </button>
            <span className="hd-stamp">{now}</span>
          </div>
        </div>
        <nav className="tabs">
          {TABS.map(([k, l]) => (
            <button key={k} className={"tab" + (tab === k ? " on" : "")}
                    onClick={() => setTab(k)}>{l}</button>
          ))}
        </nav>
      </header>

      <main className="main">
        {tab === "genel" && (
          <>
            {insights.length > 0 && (
              <section className="card insight-card">
                <div className="card-h">
                  <h2 className="card-title">Bugünün Öne Çıkanları</h2>
                  <span className="badge">Otomatik analiz</span>
                </div>
                <ul className="insight-list">
                  {insights.map((ins, i) => (
                    <li className="insight-item" key={i}>
                      <span className="insight-dot" style={{ background: ins.renk }} />
                      {ins.metin}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="grid grid-4">
              <Kpi label="Toplam Kurulu Güç" value={fmt(total)} unit=" MW"
                   sub={`${sources.length} kaynak · ${asOf}`} accent="#38BDF8" />
              <Kpi label="Yenilenebilir Payı" value={renewPct} unit=" %"
                   sub={`${fmt(renew)} MW yenilenebilir`} accent="#84CC16" />
              <Kpi label="Anlık Üretim" value={fmt(uretim)} unit=" MW"
                   sub={`${cur.saat} itibarıyla`} accent="#FBBF24" />
              <Kpi label="Anlık Tüketim" value={fmt(tuketim)} unit=" MW"
                   sub={`Üretim − ${fmt(uretim - tuketim)} MW`} accent="#F97316" />
            </section>

            <section className="card signature">
              <div className="card-h">
                <div>
                  <h2 className="card-title">Bugünkü Üretim Eğrisi</h2>
                  <p className="card-sub">Saatlik üretim, kaynak bazında yığılmış (MW)</p>
                </div>
                <span className="badge">{day.length} saat</span>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={day} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="saat" tick={{ fill: "#64748B", fontSize: 11 }}
                         interval={2} tickLine={false} axisLine={{ stroke: "#1E293B" }} />
                  <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false}
                         axisLine={false} tickFormatter={(v) => `${Math.round(v/1000)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  {AREA_KEYS.map((k) => (
                    <Area key={k} type="monotone" dataKey={k} name={nameOf(k)}
                          stackId="1" stroke={colorOf(k)} strokeWidth={0.5}
                          fill={colorOf(k)} fillOpacity={0.72} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </section>

            <section className="grid grid-2">
              <div className="card">
                <div className="card-h">
                  <h2 className="card-title">Kaynak Bazında Kurulu Güç</h2>
                  <span className="badge">MW</span>
                </div>
                <div className="bars">
                  {sorted.map((s) => (
                    <div className="bar-row" key={s.key}>
                      <span className="bar-name">{s.name}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{
                          width: `${(s.mw / sorted[0].mw) * 100}%`, background: s.color }} />
                      </div>
                      <span className="bar-val">{fmt(s.mw)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-h">
                  <h2 className="card-title">2025 Üretim Dağılımı</h2>
                  <span className="badge">%</span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={GENMIX} dataKey="value" nameKey="name"
                         innerRadius={62} outerRadius={100} paddingAngle={2} stroke="none">
                      {GENMIX.map((g) => <Cell key={g.name} fill={g.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip unit="%" />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="legend">
                  {GENMIX.map((g) => (
                    <span className="lg" key={g.name}>
                      <span className="lg-dot" style={{ background: g.color }} />
                      {g.name} <b>%{g.value}</b>
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {tab === "kurulu" && (
          <>
            <section className="grid grid-2">
              <div className="card">
                <div className="card-h">
                  <div>
                    <h2 className="card-title">Kurulu Güç Dağılımı</h2>
                    <p className="card-sub">{asOf} itibarıyla</p>
                  </div>
                  <span className="badge">{fmt(total)} MW</span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={sources} dataKey="mw" nameKey="name"
                         innerRadius={70} outerRadius={112} paddingAngle={1.5} stroke="none">
                      {sources.map((s) => <Cell key={s.key} fill={s.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="split">
                  <div><span className="split-dot" style={{ background: "#84CC16" }} />
                    Yenilenebilir <b>%{renewPct}</b></div>
                  <div><span className="split-dot" style={{ background: "#64748B" }} />
                    Fosil / Diğer <b>%{(100 - renewPct).toFixed(1)}</b></div>
                </div>
              </div>

              <div className="card">
                <div className="card-h">
                  <h2 className="card-title">Kaynak Tablosu</h2>
                  <span className="badge">{asOf}</span>
                </div>
                <table className="tbl">
                  <thead>
                    <tr><th>Kaynak</th><th className="r">MW</th><th className="r">Pay</th><th className="r">Tür</th></tr>
                  </thead>
                  <tbody>
                    {sorted.map((s) => (
                      <tr key={s.key}>
                        <td><span className="td-dot" style={{ background: s.color }} />{s.name}</td>
                        <td className="r mono">{fmt(s.mw)}</td>
                        <td className="r mono">%{((s.mw / total) * 100).toFixed(1)}</td>
                        <td className="r">
                          <span className={"pill " + (s.renewable ? "py" : "pn")}>
                            {s.renewable ? "Yenilenebilir" : "Fosil"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td>Toplam</td><td className="r mono">{fmt(total)}</td>
                        <td className="r mono">%100</td><td /></tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section className="card">
              <div className="card-h">
                <div>
                  <h2 className="card-title">Toplam Kurulu Güç Gelişimi</h2>
                  <p className="card-sub">Yıl sonu, 2021–2025 (MW)</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={hist} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 12 }}
                         tickLine={false} axisLine={{ stroke: "#1E293B" }} />
                  <YAxis domain={[70000, 130000]} tick={{ fill: "#64748B", fontSize: 11 }}
                         tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="toplam" name="Toplam Kurulu Güç"
                        stroke="#38BDF8" strokeWidth={2.5} fill="url(#gt)" />
                </AreaChart>
              </ResponsiveContainer>
            </section>
          </>
        )}

        {tab === "uretim" && (
          <>
            <section className="grid grid-4">
              <Kpi label="Anlık Üretim" value={fmt(uretim)} unit=" MW" sub={cur.saat} accent="#FBBF24" />
              <Kpi label="Anlık Güneş" value={fmt(cur.gunes)} unit=" MW"
                   sub={`Kapasite kul. %${mwOf("gunes") ? ((cur.gunes/mwOf("gunes"))*100).toFixed(0) : 0}`} accent="#FBBF24" />
              <Kpi label="Anlık Rüzgar" value={fmt(cur.ruzgar)} unit=" MW"
                   sub={`Kapasite kul. %${mwOf("ruzgar") ? ((cur.ruzgar/mwOf("ruzgar"))*100).toFixed(0) : 0}`} accent="#2DD4BF" />
              <Kpi label="Anlık Hidro" value={fmt(cur.barajli + cur.akarsu)} unit=" MW"
                   sub="Barajlı + akarsu" accent="#3B82F6" />
            </section>

            <section className="card">
              <div className="card-h">
                <div>
                  <h2 className="card-title">Saatlik Üretim — Kaynak Kırılımı</h2>
                  <p className="card-sub">Bugün (MW)</p>
                </div>
                <span className="badge">Yığılmış alan</span>
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={day} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="saat" tick={{ fill: "#64748B", fontSize: 11 }}
                         interval={2} tickLine={false} axisLine={{ stroke: "#1E293B" }} />
                  <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false}
                         axisLine={false} tickFormatter={(v) => `${Math.round(v/1000)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  {AREA_KEYS.map((k) => (
                    <Area key={k} type="monotone" dataKey={k} name={nameOf(k)}
                          stackId="1" stroke={colorOf(k)} strokeWidth={0.5}
                          fill={colorOf(k)} fillOpacity={0.72} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </section>

            <section className="card">
              <div className="card-h">
                <h2 className="card-title">Anlık Üretim — Kaynak Bazında</h2>
                <span className="badge">{cur.saat}</span>
              </div>
              <div className="bars">
                {sources.map((s) => ({ ...s, now: cur[s.key] || 0 }))
                  .sort((a, b) => b.now - a.now)
                  .map((s) => (
                    <div className="bar-row" key={s.key}>
                      <span className="bar-name">{s.name}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{
                          width: `${uretim ? (s.now / uretim) * 100 * 3.2 : 0}%`,
                          background: s.color }} />
                      </div>
                      <span className="bar-val">{fmt(s.now)}</span>
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}

        {tab === "fiyat" && (
          <>
            {fiyat.length === 0 ? (
              <section className="card">
                <div className="empty">Fiyat verisi yükleniyor ya da şu an mevcut değil.</div>
              </section>
            ) : (
              <>
                <section className="grid grid-4">
                  <Kpi label="Anlık PTF" value={fmt(curFiyat?.ptf)} unit=" TL/MWh"
                       sub={`${curFiyat?.saat} itibarıyla`} accent="#38BDF8" />
                  <Kpi label="Günlük Ortalama PTF" value={fmt(fiyatOrt)} unit=" TL/MWh"
                       sub="Bugünün saatlik ortalaması" accent="#FBBF24" />
                  <Kpi label="Gün İçi En Düşük" value={fmt(fiyatMin?.ptf)} unit=" TL/MWh"
                       sub={`${fiyatMin?.saat}`} accent="#84CC16" />
                  <Kpi label="Gün İçi En Yüksek" value={fmt(fiyatMax?.ptf)} unit=" TL/MWh"
                       sub={`${fiyatMax?.saat}`} accent="#F97316" />
                </section>

                <section className="card signature">
                  <div className="card-h">
                    <div>
                      <h2 className="card-title">Saatlik Piyasa Fiyatları</h2>
                      <p className="card-sub">PTF (Piyasa Takas Fiyatı), SMF (Sistem Marjinal Fiyatı), AOF (Ağırlıklı Ortalama Fiyat) — TL/MWh</p>
                    </div>
                    <span className="badge">{fiyat.length} saat</span>
                  </div>
                  <ResponsiveContainer width="100%" height={340}>
                    <LineChart data={fiyat} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                      <CartesianGrid stroke="#1E293B" vertical={false} />
                      <XAxis dataKey="saat" tick={{ fill: "#64748B", fontSize: 11 }}
                             interval={2} tickLine={false} axisLine={{ stroke: "#1E293B" }} />
                      <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false}
                             axisLine={false} tickFormatter={(v) => `${Math.round(v)}`} />
                      <Tooltip content={<ChartTooltip unit="TL/MWh" />} />
                      <Line type="monotone" dataKey="ptf" name="PTF" stroke="#38BDF8" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="smf" name="SMF" stroke="#F97316" strokeWidth={2} dot={false} strokeDasharray="4 3" />
                      <Line type="monotone" dataKey="aof" name="AOF" stroke="#84CC16" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="legend">
                    <span className="lg"><span className="lg-dot" style={{ background: "#38BDF8" }} />PTF (gün öncesi piyasa)</span>
                    <span className="lg"><span className="lg-dot" style={{ background: "#F97316" }} />SMF (dengeleme fiyatı)</span>
                    <span className="lg"><span className="lg-dot" style={{ background: "#84CC16" }} />AOF (ağırlıklı ortalama)</span>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {tab === "hedef" && (
          <>
            {!hedefler ? (
              <section className="card">
                <div className="empty">Hedef verisi yükleniyor ya da şu an mevcut değil.</div>
              </section>
            ) : (
              <>
                <section className="card">
                  <div className="card-h">
                    <div>
                      <h2 className="card-title">ETKB 2024–2028 Stratejik Planı — Hedef Tamamlanma Durumu</h2>
                      <p className="card-sub">
                        Enerji ve Tabii Kaynaklar Bakanlığı stratejik plan hedefleri, gerçek EPİAŞ/TEİAŞ verileriyle karşılaştırılmıştır.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-3">
                    {hedefler.hedef_ozet.map((h) => (
                      <div className="hedef-ozet-card" key={h.hedef_kodu}>
                        <div className="hedef-ozet-kod">{h.hedef_kodu}</div>
                        <div className="hedef-ozet-metin">{h.hedef_metni}</div>
                        {h.tamamlanma_yuzde === null ? (
                          <div className="hedef-ozet-veriyok">Yeterli veri yok</div>
                        ) : (
                          <>
                            <div className="hedef-ozet-yuzde">%{fmtHedef(h.tamamlanma_yuzde)}</div>
                            <HedefBar pct={h.tamamlanma_yuzde} />
                            <div className="hedef-ozet-alt">
                              {h.veri_olan_sayisi}/{h.gosterge_sayisi} gösterge ile hesaplandı
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {["Hedef (H1.1)", "Hedef (H2.1)", "Hedef (H3.1)"].map((hkod) => {
                  const items = hedefler.gostergeler.filter((g) => g.hedef_kodu === hkod);
                  if (!items.length) return null;
                  return (
                    <section className="card" key={hkod}>
                      <div className="card-h">
                        <div>
                          <h2 className="card-title">{hkod}</h2>
                          <p className="card-sub">{items[0].hedef_metni}</p>
                        </div>
                      </div>
                      <div className="hedef-list">
                        {items.map((g) => (
                          <div className="hedef-item" key={g.gosterge_kodu}>
                            <div className="hedef-item-h">
                              <span className="hedef-item-kod">{g.gosterge_kodu}</span>
                              <span className="hedef-item-ad">{g.gosterge_adi}</span>
                            </div>
                            {!g.veri_var ? (
                              <div className="hedef-veriyok-row">
                                Bu gösterge için elimizde gerçekleşme verisi bulunmuyor.
                              </div>
                            ) : (
                              <>
                                <div className="hedef-item-degerler">
                                  <span>Başlangıç (2024): <b>{fmtHedef(g.baseline)} {g.birim}</b></span>
                                  <span>Gerçekleşen ({g.donem}): <b>{fmtHedef(g.gerceklesen)} {g.birim}</b></span>
                                  <span>{g.hedef_donem_yili} Hedefi: <b>{fmtHedef(g.hedef_donem_degeri)} {g.birim}</b></span>
                                  <span>2028 Nihai Hedef: <b>{fmtHedef(g.hedef_2028)} {g.birim}</b></span>
                                </div>
                                <HedefBar pct={g.tamamlanma_yuzde} />
                                <div className="hedef-item-yuzde">
                                  %{fmtHedef(g.tamamlanma_yuzde)} — 2024 başlangıcından 2028 nihai hedefine kadarki yolun tamamlanan kısmı
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}

                <p className="card-sub" style={{ padding: "0 4px" }}>
                  Kurulu güç göstergeleri {hedefler.gostergeler[0]?.donem} itibarıyla, üretim göstergeleri son tamamlanmış takvim yılı esas alınarak hesaplanmıştır.
                  Nükleer enerjiye dair göstergeler, kullandığımız TEİAŞ/EPİAŞ verilerinde ayrı bir kalem olarak yer almadığından gerçekleşen değeri 0 kabul edilerek hesaplanmıştır.
                </p>
              </>
            )}
          </>
        )}

        {tab === "harita" && (
          <>
            {!baraj ? (
              <section className="card">
                <div className="empty">Baraj doluluk verisi yükleniyor ya da şu an mevcut değil.</div>
              </section>
            ) : (
              <>
                <section className="card">
                  <div className="card-h">
                    <div>
                      <h2 className="card-title">Barajların Doluluk Oranı — İl Bazında</h2>
                      <p className="card-sub">
                        EPİAŞ'tan {baraj.as_of} itibarıyla — {baraj.baraj_sayisi} baraj, ulusal ortalama %{fmtHedef(baraj.ulusal_ortalama)}
                      </p>
                    </div>
                  </div>

                  <div className="harita-wrap">
                    <svg viewBox={TR_VIEWBOX} className="harita-svg">
                      {TR_PROVINCES.map((p) => {
                        const doluluk = ilDoluluk(p.name);
                        return (
                          <path key={p.name} d={p.path}
                                fill={dolulukRengi(doluluk)}
                                stroke="#0A0F1C" strokeWidth="0.4">
                            <title>
                              {p.name}: {doluluk !== null ? `%${fmtHedef(doluluk)} doluluk` : "baraj yok / veri yok"}
                            </title>
                          </path>
                        );
                      })}
                    </svg>
                    <div className="harita-legend">
                      <span>%0</span>
                      <div className="harita-legend-bar"
                           style={{ background: "linear-gradient(90deg, #EF4444, #FBBF24, #3B82F6)" }} />
                      <span>%100</span>
                    </div>
                  </div>
                  <p className="card-sub" style={{ marginTop: 8 }}>
                    Üzerine gelerek il bazında doluluk oranını görebilirsin. Değer, o ildeki barajların kurulu güç ağırlıklı ortalamasıdır.
                    Gri iller "veri yok" demektir — bu, o ilde baraj olmadığı anlamına gelmez. EPİAŞ'ın bu servisi {baraj.baraj_sayisi} barajı
                    kapsıyor; GAP bölgesindeki büyük barajlar (Atatürk, Keban, Karakaya, Birecik, Karkamış vb.) bu listede yer almıyor —
                    muhtemelen DSİ tarafından ayrı bir kanaldan izleniyorlar.
                  </p>
                </section>

                <section className="card">
                  <div className="card-h">
                    <h2 className="card-title">Havzalara Göre Ortalama Doluluk</h2>
                    <span className="badge">{baraj.havzalar.length} havza</span>
                  </div>
                  <div className="bars">
                    {baraj.havzalar.map((h) => (
                      <div className="bar-row" key={h.havza}>
                        <span className="bar-name">{h.havza}</span>
                        <div className="bar-track">
                          <div className="bar-fill" style={{
                            width: `${h.doluluk}%`, background: dolulukRengi(h.doluluk) }} />
                        </div>
                        <span className="bar-val">%{fmtHedef(h.doluluk)}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="card">
                  <div className="card-h">
                    <div>
                      <h2 className="card-title">En Düşük Doluluklu 10 Baraj</h2>
                      <p className="card-sub">Kuraklık riski açısından takip edilmesi gereken barajlar</p>
                    </div>
                  </div>
                  <div className="bars">
                    {baraj.en_dusuk_barajlar.map((b) => (
                      <div className="bar-row" key={b.damId}>
                        <span className="bar-name">{b.damName} <span style={{ color: "var(--tx3)", fontSize: 11 }}>({b.basin})</span></span>
                        <div className="bar-track">
                          <div className="bar-fill" style={{
                            width: `${b.fullnessPct}%`, background: dolulukRengi(b.fullnessPct) }} />
                        </div>
                        <span className="bar-val">%{fmtHedef(b.fullnessPct)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {tab === "tarih" && (
          <>
            <section className="card">
              <div className="card-h">
                <div>
                  <h2 className="card-title">Kaynak Bazında Kurulu Güç Gelişimi</h2>
                  <p className="card-sub">Yıl aralığı ve kaynakları seç — {yearFrom}–{yearTo} (MW)</p>
                </div>
                <div className="hd-controls">
                  <div className="range">
                    <label>Aralık</label>
                    <select value={yearFrom}
                      onChange={(e) => { const v = e.target.value; setYearFrom(v); if (v > yearTo) setYearTo(v); }}>
                      {histYears.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="range-sep">–</span>
                    <select value={yearTo}
                      onChange={(e) => { const v = e.target.value; setYearTo(v); if (v < yearFrom) setYearFrom(v); }}>
                      {histYears.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="chip-actions">
                    <button className="chip-btn"
                            onClick={() => setHistSel(HIST_SOURCES.map((s) => s.key))}>Tümü</button>
                    <button className="chip-btn" onClick={() => setHistSel([])}>Temizle</button>
                  </div>
                </div>
              </div>

              <div className="chips">
                {HIST_SOURCES.map((s) => {
                  const on = histSel.includes(s.key);
                  return (
                    <button key={s.key}
                      className={"chip" + (on ? " on" : "")}
                      style={on ? { "--c": s.color, borderColor: s.color, color: s.color } : {}}
                      onClick={() => setHistSel((prev) =>
                        prev.includes(s.key) ? prev.filter((k) => k !== s.key) : [...prev, s.key])}>
                      <span className="chip-dot" style={{ background: s.color }} />
                      {s.name}
                    </button>
                  );
                })}
              </div>

              {histSel.length === 0 ? (
                <div className="empty">En az bir kaynak seç — grafik burada görünecek.</div>
              ) : (
                <ResponsiveContainer width="100%" height={330}>
                  <LineChart data={histView} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                    <CartesianGrid stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 12 }}
                           tickLine={false} axisLine={{ stroke: "#1E293B" }} />
                    <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false}
                           axisLine={false} tickFormatter={(v) => `${Math.round(v/1000)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    {HIST_SOURCES.filter((s) => histSel.includes(s.key)).map((s) => (
                      <Line key={s.key} type="monotone" dataKey={s.key} name={s.name}
                            stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </section>

            <section className="card">
              <div className="card-h">
                <div>
                  <h2 className="card-title">Yıllık Toplam Kurulu Güç</h2>
                  <p className="card-sub">{yearFrom}–{yearTo} (MW) — {asOf} itibarıyla en güncel değer</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={histView} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                  <CartesianGrid stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 12 }}
                         tickLine={false} axisLine={{ stroke: "#1E293B" }} />
                  <YAxis domain={[0, 130000]} tick={{ fill: "#64748B", fontSize: 11 }}
                         tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="toplam" name="Toplam Kurulu Güç" radius={[6, 6, 0, 0]}>
                    {histView.map((_, i) => (
                      <Cell key={i} fill={i === histView.length - 1 ? "#38BDF8" : "#1D4E6E"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="card-sub" style={{ marginTop: 10 }}>
                Diğer yıllar Aralık (yıl sonu) değeridir; en son yıl ({hist[hist.length - 1]?.year}) için
                gösterilen rakam yılın tamamını değil, {asOf} itibarıyla ulaşılan kurulu gücü yansıtır.
              </p>
            </section>

            {uretimHist.length > 0 && (
              <section className="card">
                <div className="card-h">
                  <div>
                    <h2 className="card-title">Yıllara ve Kaynaklara Göre Elektrik Üretimi</h2>
                    <p className="card-sub">
                      Yıl aralığı ve kaynakları seç — {uYearFrom}–{uYearTo} (GWh)
                    </p>
                  </div>
                  <div className="hd-controls">
                    <div className="range">
                      <label>Aralık</label>
                      <select value={uYearFrom || ""}
                        onChange={(e) => { const v = e.target.value; setUYearFrom(v); if (v > uYearTo) setUYearTo(v); }}>
                        {uretimYears.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <span className="range-sep">–</span>
                      <select value={uYearTo || ""}
                        onChange={(e) => { const v = e.target.value; setUYearTo(v); if (v < uYearFrom) setUYearFrom(v); }}>
                        {uretimYears.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div className="chip-actions">
                      <button className={"chip-btn" + (uretimMode === "mutlak" ? " active" : "")}
                              onClick={() => setUretimMode("mutlak")}>GWh</button>
                      <button className={"chip-btn" + (uretimMode === "yuzde" ? " active" : "")}
                              onClick={() => setUretimMode("yuzde")}>%</button>
                    </div>
                    <div className="chip-actions">
                      <button className="chip-btn"
                              onClick={() => setUretimSel(HIST_SOURCES.map((s) => s.key))}>Tümü</button>
                      <button className="chip-btn" onClick={() => setUretimSel([])}>Temizle</button>
                    </div>
                  </div>
                </div>

                <div className="chips">
                  {HIST_SOURCES.map((s) => {
                    const on = uretimSel.includes(s.key);
                    return (
                      <button key={s.key}
                        className={"chip" + (on ? " on" : "")}
                        style={on ? { "--c": s.color, borderColor: s.color, color: s.color } : {}}
                        onClick={() => setUretimSel((prev) =>
                          prev.includes(s.key) ? prev.filter((k) => k !== s.key) : [...prev, s.key])}>
                        <span className="chip-dot" style={{ background: s.color }} />
                        {s.name}
                      </button>
                    );
                  })}
                </div>

                {uretimSel.length === 0 ? (
                  <div className="empty">En az bir kaynak seç — grafik burada görünecek.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={330}>
                    <LineChart data={uretimViewData} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                      <CartesianGrid stroke="#1E293B" vertical={false} />
                      <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 12 }}
                             tickLine={false} axisLine={{ stroke: "#1E293B" }} />
                      <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false}
                             axisLine={false}
                             tickFormatter={(v) => uretimMode === "yuzde" ? `%${v}` : `${Math.round(v / 1000)}k`} />
                      <Tooltip content={<ChartTooltip unit={uretimMode === "yuzde" ? "%" : "GWh"} />} />
                      {HIST_SOURCES.filter((s) => uretimSel.includes(s.key)).map((s) => (
                        <Line key={s.key} type="monotone" dataKey={s.key} name={s.name}
                              stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
                <p className="card-sub" style={{ marginTop: 10 }}>
                  2026 verisi yılın tamamını değil, o ana kadarki ayları kapsar (kısmi yıl).
                </p>
              </section>
            )}

            {uretimHist.length > 0 && (
              <section className="card">
                <div className="card-h">
                  <div>
                    <h2 className="card-title">Yıllık Toplam Elektrik Üretimi</h2>
                    <p className="card-sub">{uYearFrom}–{uYearTo} (GWh)</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={uretimView} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                    <CartesianGrid stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 12 }}
                           tickLine={false} axisLine={{ stroke: "#1E293B" }} />
                    <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false}
                           axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip content={<ChartTooltip unit="GWh" />} />
                    <Bar dataKey="toplam" name="Toplam Üretim" radius={[6, 6, 0, 0]}>
                      {uretimView.map((row, i) => (
                        <Cell key={i} fill={row.ay_sayisi === 12 ? "#38BDF8" : "#F97316"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="card-sub" style={{ marginTop: 10 }}>
                  Turuncu çubuk, o yılın henüz tamamlanmamış (kısmi) verisini gösterir.
                </p>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="ft">
        Üretim verisi EPİAŞ rt-gen servisinden canlı çekilir · Kurulu güç ve tarihsel seri
        TEİAŞ raporlarından ({asOf}) · {live ? "Backend bağlı" : "Backend'e ulaşılamadı, demo veri gösteriliyor"}
      </footer>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');
.root{ --bg:#0A0F1C; --panel:#111827; --panel2:#0F172A; --line:#1E293B;
  --tx:#E8EDF4; --tx2:#8A97AD; --tx3:#64748B;
  background:var(--bg); color:var(--tx); min-height:100vh;
  font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif; -webkit-font-smoothing:antialiased; }
.mono{ font-family:'JetBrains Mono',ui-monospace,monospace; font-variant-numeric:tabular-nums; }
.hd{ position:sticky; top:0; z-index:20; background:rgba(10,15,28,.92); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
.hd-line{ height:3px; background:linear-gradient(90deg,#FBBF24,#F97316,#3B82F6,#2DD4BF,#84CC16); }
.hd-in{ max-width:1180px; margin:0 auto; padding:20px 24px 6px; display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; }
.hd-eyebrow{ font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--tx3); font-weight:600; margin-bottom:6px; }
.hd-title{ font-size:26px; font-weight:800; letter-spacing:-.02em; margin:0; }
.hd-desc{ color:var(--tx2); font-size:13.5px; margin:4px 0 0; }
.hd-live{ display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
.live{ display:inline-flex; align-items:center; gap:7px; font-size:12px; font-weight:600; color:#4ADE80; background:rgba(74,222,128,.1); border:1px solid rgba(74,222,128,.25); padding:5px 11px; border-radius:999px; }
.live.demo{ color:#FBBF24; background:rgba(251,191,36,.1); border-color:rgba(251,191,36,.25); }
.live-dot{ width:7px; height:7px; border-radius:50%; background:currentColor; animation:pulse 2s infinite; }
@keyframes pulse{ 0%{box-shadow:0 0 0 0 rgba(74,222,128,.5)} 70%{box-shadow:0 0 0 8px rgba(74,222,128,0)} 100%{box-shadow:0 0 0 0 rgba(74,222,128,0)} }
.hd-stamp{ font-size:12px; color:var(--tx3); font-variant-numeric:tabular-nums; }
.share-btn{ font-family:inherit; font-size:11px; font-weight:600; color:var(--tx2);
  background:var(--panel2); border:1px solid var(--line); padding:5px 10px; border-radius:7px;
  cursor:pointer; white-space:nowrap; }
.share-btn:hover{ color:var(--tx); border-color:#38BDF8; }

.insight-card{ background:linear-gradient(180deg,#111827,#0D1424); border-color:#1E3A5F; }
.insight-list{ display:flex; flex-direction:column; gap:10px; margin:0; padding:0; list-style:none; }
.insight-item{ display:flex; align-items:flex-start; gap:10px; font-size:13.5px; color:var(--tx); line-height:1.5; }
.insight-dot{ width:8px; height:8px; border-radius:50%; margin-top:6px; flex-shrink:0; }
.tabs{ max-width:1180px; margin:0 auto; padding:6px 16px 0; display:flex; gap:2px; }
.tab{ background:transparent; border:none; color:var(--tx2); font-size:13.5px; font-weight:600; padding:11px 16px; cursor:pointer; border-bottom:2px solid transparent; font-family:inherit; }
.tab:hover{ color:var(--tx); }
.tab.on{ color:var(--tx); border-bottom-color:#38BDF8; }
.main{ max-width:1180px; margin:0 auto; padding:22px 24px 8px; }
.grid{ display:grid; gap:16px; margin-bottom:16px; }
.grid-4{ grid-template-columns:repeat(4,1fr); }
.grid-3{ grid-template-columns:repeat(3,1fr); }
.grid-2{ grid-template-columns:repeat(2,1fr); }
@media(max-width:820px){ .grid-3{grid-template-columns:1fr} }
@media(max-width:820px){ .grid-4{grid-template-columns:repeat(2,1fr)} .grid-2{grid-template-columns:1fr} }
@media(max-width:520px){ .grid-4{grid-template-columns:1fr} }
.kpi{ background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:16px 16px 14px; position:relative; overflow:hidden; }
.kpi::before{ content:""; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--acc); }
.kpi-label{ font-size:12px; color:var(--tx2); font-weight:500; margin-bottom:10px; }
.kpi-val{ font-size:28px; font-weight:800; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.kpi-unit{ font-size:14px; font-weight:600; color:var(--tx2); }
.kpi-sub{ font-size:11.5px; color:var(--tx3); margin-top:6px; }
.card{ background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:18px; margin-bottom:16px; }
.signature{ background:linear-gradient(180deg,#111827,#0D1424); box-shadow:0 0 40px rgba(56,189,248,.05) inset; }
.card-h{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; gap:12px; }
.card-title{ font-size:15px; font-weight:700; margin:0; letter-spacing:-.01em; }
.card-sub{ font-size:12px; color:var(--tx2); margin:3px 0 0; }
.badge{ font-size:11px; font-weight:600; color:var(--tx2); background:var(--panel2); border:1px solid var(--line); padding:4px 9px; border-radius:7px; white-space:nowrap; }
.bars{ display:flex; flex-direction:column; gap:9px; }
.bar-row{ display:grid; grid-template-columns:112px 1fr 62px; align-items:center; gap:10px; }
.bar-name{ font-size:12.5px; color:var(--tx2); }
.bar-track{ height:9px; background:var(--panel2); border-radius:5px; overflow:hidden; }
.bar-fill{ height:100%; border-radius:5px; transition:width .5s ease; }
.bar-val{ font-size:12.5px; text-align:right; font-family:'JetBrains Mono',monospace; font-variant-numeric:tabular-nums; }
.legend{ display:flex; flex-wrap:wrap; gap:8px 14px; margin-top:8px; justify-content:center; }
.lg{ font-size:12px; color:var(--tx2); display:inline-flex; align-items:center; gap:6px; }
.lg b{ color:var(--tx); }
.lg-dot{ width:9px; height:9px; border-radius:3px; }
.split{ display:flex; justify-content:space-around; gap:12px; margin-top:6px; padding-top:14px; border-top:1px solid var(--line); font-size:13px; color:var(--tx2); }
.split b{ color:var(--tx); margin-left:4px; }
.split-dot{ width:9px; height:9px; border-radius:3px; display:inline-block; margin-right:7px; }
.tbl{ width:100%; border-collapse:collapse; font-size:13px; }
.tbl th{ text-align:left; color:var(--tx3); font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:.06em; padding:0 8px 10px; border-bottom:1px solid var(--line); }
.tbl td{ padding:9px 8px; border-bottom:1px solid rgba(30,41,59,.5); color:var(--tx); }
.tbl .r{ text-align:right; }
.td-dot{ width:9px; height:9px; border-radius:3px; display:inline-block; margin-right:8px; }
.tbl tfoot td{ font-weight:700; border-bottom:none; border-top:1px solid var(--line); }
.pill{ font-size:10.5px; font-weight:600; padding:3px 8px; border-radius:6px; }
.pill.py{ color:#84CC16; background:rgba(132,204,22,.12); }
.pill.pn{ color:#94A3B8; background:rgba(148,163,184,.12); }
.tt{ background:#0B1220; border:1px solid var(--line); border-radius:10px; padding:10px 12px; box-shadow:0 10px 30px rgba(0,0,0,.4); }
.tt-h{ font-size:12px; font-weight:700; margin-bottom:8px; color:var(--tx); }
.tt-r{ display:grid; grid-template-columns:12px 1fr auto; align-items:center; gap:8px; margin:3px 0; }
.tt-dot{ width:9px; height:9px; border-radius:3px; }
.tt-n{ font-size:12px; color:var(--tx2); }
.tt-v{ font-size:12px; font-weight:600; font-variant-numeric:tabular-nums; color:var(--tx); }
.hd-controls{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.range{ display:inline-flex; align-items:center; gap:6px; }
.range label{ font-size:11px; font-weight:600; color:var(--tx3); text-transform:uppercase; letter-spacing:.06em; margin-right:2px; }
.range select{ font-family:inherit; font-size:12.5px; font-weight:600; color:var(--tx);
  background:var(--panel2); border:1px solid var(--line); border-radius:7px; padding:5px 8px; cursor:pointer; }
.range select:hover{ border-color:var(--tx3); }
.range-sep{ color:var(--tx3); }
.chips{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
.chip{ display:inline-flex; align-items:center; gap:7px; font-family:inherit; font-size:12.5px; font-weight:600;
  color:var(--tx2); background:var(--panel2); border:1px solid var(--line); padding:6px 12px;
  border-radius:999px; cursor:pointer; transition:all .15s ease; }
.chip:hover{ color:var(--tx); border-color:var(--tx3); }
.chip.on{ background:transparent; }
.chip-dot{ width:9px; height:9px; border-radius:50%; opacity:.4; transition:opacity .15s; }
.chip.on .chip-dot{ opacity:1; }
.chip-actions{ display:flex; gap:6px; }
.chip-btn{ font-family:inherit; font-size:11px; font-weight:600; color:var(--tx2); background:var(--panel2);
  border:1px solid var(--line); padding:5px 10px; border-radius:7px; cursor:pointer; }
.chip-btn:hover{ color:var(--tx); border-color:var(--tx3); }
.chip-btn.active{ color:#38BDF8; border-color:#38BDF8; background:rgba(56,189,248,.1); }
.empty{ text-align:center; color:var(--tx3); font-size:13px; padding:60px 0; }
.ft{ max-width:1180px; margin:0 auto; padding:16px 24px 30px; font-size:11.5px; color:var(--tx3); }

/* HEDEFLER */
.hedef-ozet-card{ background:var(--panel2); border:1px solid var(--line); border-radius:12px; padding:16px; }
.hedef-ozet-kod{ font-size:11px; font-weight:700; color:#38BDF8; text-transform:uppercase; letter-spacing:.05em; }
.hedef-ozet-metin{ font-size:13px; color:var(--tx); margin:6px 0 12px; line-height:1.4; }
.hedef-ozet-yuzde{ font-size:24px; font-weight:800; margin-bottom:8px; }
.hedef-ozet-alt{ font-size:11px; color:var(--tx3); margin-top:6px; }
.hedef-ozet-veriyok{ font-size:12.5px; color:var(--tx3); font-style:italic; padding:8px 0; }
.hedef-bar-track{ height:8px; background:var(--panel); border-radius:5px; overflow:hidden; }
.hedef-bar-fill{ height:100%; border-radius:5px; transition:width .5s ease; }
.hedef-list{ display:flex; flex-direction:column; gap:16px; }
.hedef-item{ padding:14px; background:var(--panel2); border:1px solid var(--line); border-radius:12px; }
.hedef-item-h{ display:flex; align-items:baseline; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
.hedef-item-kod{ font-size:11px; font-weight:700; color:#38BDF8; }
.hedef-item-ad{ font-size:13px; font-weight:600; color:var(--tx); }
.hedef-item-degerler{ display:flex; flex-wrap:wrap; gap:6px 18px; font-size:12px; color:var(--tx2); margin-bottom:10px; }
.hedef-item-degerler b{ color:var(--tx); font-family:'JetBrains Mono',monospace; }
.hedef-item-yuzde{ font-size:11.5px; color:var(--tx3); margin-top:6px; }
.hedef-veriyok-row{ font-size:12.5px; color:var(--tx3); font-style:italic; }

.harita-wrap{ display:flex; flex-direction:column; align-items:center; gap:10px; }
.harita-svg{ width:100%; max-width:600px; height:auto; }
.harita-svg path{ transition:opacity .15s ease; cursor:pointer; }
.harita-svg path:hover{ opacity:0.75; stroke:#38BDF8; stroke-width:1; }
.harita-legend{ display:flex; align-items:center; gap:10px; font-size:11.5px; color:var(--tx3); flex-wrap:wrap; justify-content:center; }
.harita-legend-chips{ display:flex; flex-wrap:wrap; gap:6px 14px; justify-content:center; }
.harita-legend-bar{ width:160px; height:8px; border-radius:4px; }
`;

export default App;
