"""
EPIAS baraj doluluk servislerinin gercek veri seklini gormek icin
kesif scripti. Backend klasorunde (.env yaninda) calistir:
    python test_barajlar.py
"""
import os
from datetime import date, timedelta
from eptr2 import EPTR2

u = os.environ.get("EPTR_USERNAME")
p = os.environ.get("EPTR_PASSWORD")
e = EPTR2(username=u, password=p) if u and p else EPTR2(use_dotenv=True)

d = (date.today() - timedelta(days=1)).isoformat()
print("Kullanilan tarih:", d)


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


dene("dams-info", lambda: e.call("dams-info"))
dene("dams-active-fullness", lambda: e.call("dams-active-fullness", start_date=d, end_date=d))
dene("dams-daily-level", lambda: e.call("dams-daily-level", start_date=d, end_date=d))
dene("dams-water-energy-provision", lambda: e.call("dams-water-energy-provision", start_date=d, end_date=d))
