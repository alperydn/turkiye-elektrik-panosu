"""
Türkiye Elektrik Panosu — EPİAŞ + TEİAŞ proxy backend (FastAPI)
------------------------------------------------------------------
- /api/uretim      : CANLI. EPİAŞ rt-gen'den saatlik, kaynak bazinda uretim (MW).
- /api/kurulu-guc  : TEİAŞ'in resmi Excel'inden (kurulu_guc_teias.xlsx) en son ayin
                     kaynak bazinda kurulu gucu.
- /api/tarihsel    : Ayni Excel'den 2001'den bugune yillik kurulu guc serisi.

TEİAŞ verisini guncellemek icin: YTBS'den yeni Excel'i indirip
"kurulu_guc_teias.xlsx" adiyla bu dosyanin uzerine yaz. Kod her istekte
(kisa bir onbellekle) dosyayi yeniden okur, baska bir sey yapmana gerek yok.

Kimlik (EPİAŞ): ayni klasorde .env dosyasi:
    EPTR_USERNAME=eposta@ornek.com
    EPTR_PASSWORD=sifre

Calistirma:
    pip install -r requirements.txt
    uvicorn app:app --host 0.0.0.0 --port 8000
"""

import os
import time
from datetime import date
from pathlib import Path

import openpyxl
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from eptr2 import EPTR2

# --- EPİAŞ kimlik: once .env, yoksa ortam degiskeni ---
_u = os.environ.get("EPTR_USERNAME")
_p = os.environ.get("EPTR_PASSWORD")
try:
    eptr = EPTR2(username=_u, password=_p) if (_u and _p) else EPTR2(use_dotenv=True)
except Exception as ex:
    raise RuntimeError(f"EPTR2 baslatilamadi. .env veya ortam degiskenlerini kontrol edin: {ex}")

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")

app = FastAPI(title="Türkiye Elektrik Panosu API", version="3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
#  TEİAŞ KURULU GUC EXCEL'I — okuma ve donusum
# ------------------------------------------------------------------
XLSX_PATH = Path(__file__).parent / "kurulu_guc_teias.xlsx"
URETIM_XLSX_PATH = Path(__file__).parent / "uretim_tarihsel_teias.xlsx"

# Panonun kaynak anahtarlarina renk + yenilenebilir bilgisi
SOURCE_META = {
    "gunes":      {"name": "Güneş",            "color": "#FBBF24", "renewable": True},
    "dogalgaz":   {"name": "Doğal Gaz",        "color": "#F97316", "renewable": False},
    "barajli":    {"name": "Barajlı Hidro",    "color": "#3B82F6", "renewable": True},
    "ruzgar":     {"name": "Rüzgar",           "color": "#2DD4BF", "renewable": True},
    "linyit":     {"name": "Yerli Kömür",      "color": "#B45309", "renewable": False},
    "ithalKomur": {"name": "İthal Kömür",      "color": "#64748B", "renewable": False},
    "akarsu":     {"name": "Akarsu Hidro",     "color": "#38BDF8", "renewable": True},
    "biyokutle":  {"name": "Biyokütle",        "color": "#84CC16", "renewable": True},
    "jeotermal":  {"name": "Jeotermal",        "color": "#EC4899", "renewable": True},
    "diger":      {"name": "Fuel Oil / Diğer", "color": "#94A3B8", "renewable": False},
}


def _read_teias_rows():
    """Excel'deki 'Veri' sayfasini okuyup her satiri panonun kaynak
    anahtarlarina (gunes, dogalgaz, barajli, ...) esler."""
    if not XLSX_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=f"TEİAŞ Excel dosyasi bulunamadi: {XLSX_PATH.name}. "
                   f"Dosyayi backend klasorune koyun.",
        )
    wb = openpyxl.load_workbook(XLSX_PATH, data_only=True)
    ws = wb["Veri"]
    raw = list(ws.iter_rows(min_row=1, values_only=True))
    header = raw[0]
    idx = {name: i for i, name in enumerate(header)}

    def g(row, col, default=0.0):
        i = idx.get(col)
        v = row[i] if i is not None else None
        return float(v) if v is not None else default

    out = []
    for row in raw[1:]:
        period = row[0]  # "YYYY-MM"
        if not period:
            continue
        year, month = period.split("-")
        vals = {
            "gunes":      g(row, "Güneş (MW)"),
            "dogalgaz":   g(row, "Doğal Gaz (MW)") + g(row, "LNG (MW)"),
            "barajli":    g(row, "Barajlı (MW)"),
            "ruzgar":     g(row, "Rüzgar (MW)"),
            "linyit":     g(row, "Linyit (MW)") + g(row, "Taş Kömür (MW)") + g(row, "Asfaltit Kömür (MW)"),
            "ithalKomur": g(row, "İthal Kömür (MW)"),
            "akarsu":     g(row, "Akarsu (MW)"),
            "biyokutle":  g(row, "Biyokütle (MW)"),
            "jeotermal":  g(row, "Jeotermal (MW)"),
            "diger":      g(row, "Fuel Oil (MW)") + g(row, "Motorin (MW)") + g(row, "Nafta (MW)") + g(row, "Atık Isı (MW)"),
        }
        vals["toplam"] = g(row, "Toplam (MW)") or sum(vals.values())
        out.append({"year": year, "month": month, "period": period, **vals})
    return out


def _kurulu_guc_from_teias():
    rows = _read_teias_rows()
    last = rows[-1]  # en guncel ay
    kaynaklar = []
    for key, meta in SOURCE_META.items():
        kaynaklar.append({
            "key": key,
            "name": meta["name"],
            "mw": round(last[key]),
            "color": meta["color"],
            "renewable": meta["renewable"],
        })
    return {"as_of": last["period"], "kaynaklar": kaynaklar}


def _tarihsel_uretim_from_teias():
    """'GENEL_YILLIK_ISLETME_NETICESI' raporundan (kaynak bazinda aylik
    uretim, kWh/MWh karisik) yillik toplam uretimi GWh olarak hesaplar."""
    if not URETIM_XLSX_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Uretim Excel dosyasi bulunamadi: {URETIM_XLSX_PATH.name}.",
        )
    wb = openpyxl.load_workbook(URETIM_XLSX_PATH, data_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = list(ws.iter_rows(values_only=True))

    header_idxs = [i for i, r in enumerate(rows) if r[1] == "AY"]
    KEYS = ["dogalgaz", "linyit", "ithalKomur", "diger", "biyokutle",
            "jeotermal", "akarsu", "barajli", "gunes", "ruzgar", "toplam"]

    yearly = {}
    month_count = {}
    for hi in header_idxs:
        unit = rows[hi][-1] or ""
        is_kwh = "kWh" in unit
        year = str(rows[hi - 1][2]).strip()
        j = hi + 1
        while j < len(rows) and rows[j][1] not in (None, "AY"):
            r = rows[j]
            v = lambda i: float(r[i]) if r[i] is not None else 0.0
            vals = {
                "dogalgaz":   v(2) + v(3),
                "linyit":     v(4) + v(5) + v(6),
                "ithalKomur": v(7),
                "diger":      v(8) + v(9) + v(10) + v(11) + v(12),
                "biyokutle":  v(13),
                "jeotermal":  v(15),
                "akarsu":     v(16),
                "barajli":    v(17),
                "gunes":      v(19),
                "ruzgar":     v(20),
                "toplam":     v(21),
            }
            if is_kwh:
                vals = {k: val / 1000 for k, val in vals.items()}  # kWh -> MWh
            yearly.setdefault(year, {k: 0.0 for k in KEYS})
            month_count[year] = month_count.get(year, 0) + 1
            for k in KEYS:
                yearly[year][k] += vals[k]
            j += 1

    out = []
    for year in sorted(yearly.keys()):
        row = {"year": year, "ay_sayisi": month_count[year]}
        for k in KEYS:
            row[k] = round(yearly[year][k] / 1000, 1)  # MWh -> GWh
        out.append(row)
    return out



    rows = _read_teias_rows()
    by_year = {}
    for r in rows:
        by_year[r["year"]] = r  # ayni yil icinde ustune yazar -> en son ay kalir (Aralik varsa Aralik)
    out = []
    for year in sorted(by_year.keys()):
        r = by_year[year]
        out.append({
            "year": year,
            "toplam": round(r["toplam"]),
            "gunes": round(r["gunes"]),
            "ruzgar": round(r["ruzgar"]),
            "hidro": round(r["barajli"] + r["akarsu"]),
            "dogalgaz": round(r["dogalgaz"]),
            "linyit": round(r["linyit"]),
            "ithalKomur": round(r["ithalKomur"]),
            "jeotermal": round(r["jeotermal"]),
            "biyokutle": round(r["biyokutle"]),
            "diger": round(r["diger"]),
        })
    return out


# ------------------------------------------------------------------
#  rt-gen kolonlarini panonun kaynaklarina eslestirme (canli uretim)
# ------------------------------------------------------------------
def _to_panel(row):
    g = lambda k: float(row.get(k) or 0)
    r = {
        "saat":       str(row.get("hour", ""))[:5],
        "gunes":      round(g("sun")),
        "dogalgaz":   round(g("naturalGas")),
        "barajli":    round(g("dammedHydro")),
        "akarsu":     round(g("river")),
        "ruzgar":     round(g("wind")),
        "linyit":     round(g("lignite") + g("blackCoal") + g("asphaltiteCoal")),
        "ithalKomur": round(g("importCoal")),
        "biyokutle":  round(g("biomass")),
        "jeotermal":  round(g("geothermal")),
        "diger":      round(g("fueloil") + g("naphta") + g("lng") + g("wasteheat")),
    }
    r["toplam"] = sum(v for k, v in r.items() if k != "saat")
    return r


def _fiyatlar(start, end):
    """PTF (mcp), SMF (smp) ve AOF (wap) servislerini saat bazinda birlestirir."""
    def call(service, valcol):
        try:
            res = eptr.call(service, start_date=start, end_date=end)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"EPİAŞ {service} basarisiz: {e}")
        rows = res.to_dict(orient="records") if hasattr(res, "to_dict") else res
        return {r["date"]: float(r[valcol]) for r in rows if r.get("date") is not None}

    ptf_map = call("mcp", "price")
    smf_map = call("smp", "systemMarginalPrice")
    aof_map = call("wap", "wap")

    dates = sorted(set(ptf_map) | set(smf_map) | set(aof_map))
    out = []
    for d in dates:
        out.append({
            "saat": d[11:16],
            "ptf": round(ptf_map.get(d, 0), 2),
            "smf": round(smf_map.get(d, 0), 2),
            "aof": round(aof_map.get(d, 0), 2),
        })
    return out


# --- basit onbellek ---
_cache = {}
def cached(key, ttl, producer):
    now = time.time()
    hit = _cache.get(key)
    if hit and now - hit[0] < ttl:
        return hit[1]
    val = producer()
    _cache[key] = (now, val)
    return val


def _rt_gen(start, end):
    try:
        res = eptr.call("rt-gen", start_date=start, end_date=end)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"EPİAŞ rt-gen basarisiz: {e}")
    rows = res.to_dict(orient="records") if hasattr(res, "to_dict") else res
    return [_to_panel(r) for r in rows]


# ------------------------------------------------------------------
#  UCLAR
# ------------------------------------------------------------------
@app.get("/api/kurulu-guc")
def kurulu_guc():
    # TEİAŞ Excel'i pek sik degismiyor (ayda bir); 6 saat onbellek yeterli.
    return cached("kurulu-guc", 6 * 3600, _kurulu_guc_from_teias)


@app.get("/api/tarihsel")
def tarihsel():
    return cached("tarihsel", 6 * 3600, _tarihsel_from_teias)


@app.get("/api/uretim-tarihsel")
def uretim_tarihsel():
    return cached("uretim-tarihsel", 6 * 3600, _tarihsel_uretim_from_teias)


@app.get("/api/uretim")
def uretim(start: str | None = Query(None), end: str | None = Query(None)):
    end = end or date.today().isoformat()
    start = start or end
    return cached(f"uretim:{start}:{end}", 900, lambda: _rt_gen(start, end))


@app.get("/api/fiyatlar")
def fiyatlar(start: str | None = Query(None), end: str | None = Query(None)):
    end = end or date.today().isoformat()
    start = start or end
    return cached(f"fiyatlar:{start}:{end}", 900, lambda: _fiyatlar(start, end))


@app.get("/health")
def health():
    return {"ok": True}
