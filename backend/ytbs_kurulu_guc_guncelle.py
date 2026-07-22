"""
YTBS'den guncel kurulu guc verisini ceker ve backend klasorune
'kurulu_guc_guncel.json' olarak kaydeder. Bu dosyayi GitHub'a
commit + push ettiginde, pano otomatik olarak bu guncel veriyi kullanir.

Bu script SENIN bilgisayarindan (Turkiye IP'si ile) calismak icin
tasarlandi - Render'in kendisi YTBS'ye baglanamiyor.

Kullanim:
    pip install requests openpyxl
    python ytbs_kurulu_guc_guncelle.py

Sonra GitHub Desktop'ta 'kurulu_guc_guncel.json' degisikligini
commit + push et.
"""
import io
import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path

import requests
import openpyxl

YTBS_URL = "https://ytbsbilgi.teias.gov.tr/ytbsbilgi/frm_istatistikler.jsf"

# Bu script'in bulundugu klasore kaydedilir (backend klasoru ile ayni yerde olmali)
CIKTI_DOSYASI = Path(__file__).parent / "kurulu_guc_guncel.json"

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


def viewstate(html):
    m = re.search(r'jakarta\.faces\.ViewState[^>]*value="([^"]*)"', html)
    if not m:
        raise RuntimeError("ViewState bulunamadi")
    return m.group(1)


def ytbs_excel_cek():
    dun = (date.today() - timedelta(days=1)).strftime("%d-%m-%Y")
    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9",
        "Origin": "https://ytbsbilgi.teias.gov.tr",
        "Referer": YTBS_URL,
    })

    r1 = s.get(YTBS_URL, timeout=30)
    vs1 = viewstate(r1.text)

    r2 = s.post(YTBS_URL, timeout=30, data={
        "formdash": "formdash",
        "hidden1": "13",
        "formdash:bitisTarihi2_input": dun,
        "formdash:yilsecim_focus": "",
        "jakarta.faces.ViewState": vs1,
        "formdash:gunlukRapor": "",
    })
    vs2 = viewstate(r2.text)

    r3 = s.post(YTBS_URL, timeout=30, data={
        "formdash": "formdash",
        "hidden1": "13",
        "formdash:bitisTarihi2_input": dun,
        "formdash:yilsecim_focus": "",
        "jakarta.faces.ViewState": vs2,
        "formdash:j_idt35.x": "5",
        "formdash:j_idt35.y": "5",
    })
    ct = r3.headers.get("Content-Type", "")
    if not ("spreadsheet" in ct or "excel" in ct or "octet-stream" in ct or r3.headers.get("Content-Disposition")):
        raise RuntimeError(f"Excel donmedi (content-type={ct})")
    return r3.content


def excel_ayristir(icerik):
    wb = openpyxl.load_workbook(io.BytesIO(icerik), data_only=True)
    ws = wb["Rapor327 2"]
    rows = list(ws.iter_rows(values_only=True))
    header = rows[3]
    idx = {name: i for i, name in enumerate(header) if name}
    total_row = next((r for r in rows if r[0] == "TOPLAM (MW)"), None)
    if total_row is None:
        raise RuntimeError("TOPLAM (MW) satiri bulunamadi")

    def g(col):
        i = idx.get(col)
        v = total_row[i] if i is not None else None
        return float(v) if v is not None else 0.0

    vals = {
        "gunes":      g("GÜNEŞ"),
        "dogalgaz":   g("DOĞAL GAZ") + g("LNG"),
        "barajli":    g("BARAJLI"),
        "ruzgar":     g("RÜZGAR"),
        "linyit":     g("LİNYİT") + g("TAŞ KÖMÜR") + g("ASFALTİT KÖMÜR"),
        "ithalKomur": g("İTHAL KÖMÜR"),
        "akarsu":     g("AKARSU"),
        "biyokutle":  g("BİYOKÜTLE"),
        "jeotermal":  g("JEOTERMAL"),
        "diger":      g("FUEL OİL") + g("MOTORİN") + g("NAFTA") + g("LPG") + g("ATIK ISI"),
    }
    tarih_hucre = rows[2][1] if len(rows) > 2 else None
    as_of = f"{tarih_hucre} (YTBS günlük)" if tarih_hucre else "YTBS günlük"

    kaynaklar = []
    for key, meta in SOURCE_META.items():
        kaynaklar.append({
            "key": key, "name": meta["name"],
            "mw": round(vals.get(key, 0)),
            "color": meta["color"], "renewable": meta["renewable"],
        })
    return {"as_of": as_of, "kaynaklar": kaynaklar}


def main():
    print("1) YTBS'den Excel cekiliyor...")
    icerik = ytbs_excel_cek()
    print(f"   Alindi ({len(icerik)} byte)")

    print("2) Ayristiriliyor...")
    veri = excel_ayristir(icerik)
    print("   as_of:", veri["as_of"])
    for k in veri["kaynaklar"]:
        print(f"   {k['name']}: {k['mw']} MW")

    print(f"3) Kaydediliyor -> {CIKTI_DOSYASI}")
    with open(CIKTI_DOSYASI, "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=2)

    print("\nBASARILI. Simdi GitHub Desktop'ta bu dosyayi commit + push et:")
    print(f"   {CIKTI_DOSYASI.name}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nHATA: {e}")
        sys.exit(1)
