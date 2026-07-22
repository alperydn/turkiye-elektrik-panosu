"""
Santral haritasi icin EPIAS'ta konum/kapasite verisi olup olmadigini
kontrol eden kesif scripti. Backend klasorunde (.env yaninda) calistir:
    python test_santral.py
"""
import os
from eptr2 import EPTR2

u = os.environ.get("EPTR_USERNAME")
p = os.environ.get("EPTR_PASSWORD")
e = EPTR2(username=u, password=p) if u and p else EPTR2(use_dotenv=True)

def dene(baslik, fn):
    print("\n================== " + baslik + " ==================")
    try:
        res = fn()
        if hasattr(res, "columns"):
            print("KOLONLAR:", list(res.columns))
            print("SATIR SAYISI:", len(res))
            print(res.head(5).to_string())
        else:
            print("SONUC:", res)
    except Exception as ex:
        print("HATA:", repr(ex))

dene("lic-pp-list", lambda: e.call("lic-pp-list"))
dene("pp-list-for-date-range", lambda: e.call("pp-list-for-date-range", start_date="2026-07-01", end_date="2026-07-20"))
dene("gen-org", lambda: e.call("gen-org"))
dene("province-list", lambda: e.call("province-list"))
