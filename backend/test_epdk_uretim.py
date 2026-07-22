"""
EPDK 'Elektrik Uretim Lisansi Sorgula' servisini test eder.
Kendi bilgisayarinda calistir:
    python test_epdk_uretim.py
"""
import requests
import json

URL = "https://apigateway.epdk.gov.tr/elektrikUretimLisansiSorgula"

body = {"lisansDurumu": ["ONAYLANDI"]}

print("Istek govdesi:", json.dumps(body, ensure_ascii=False))
resp = requests.get(URL, json=body, timeout=30,
                     headers={"Content-Type": "application/json", "Accept": "application/json"})
print("Durum kodu:", resp.status_code)
print("Toplam uzunluk:", len(resp.text))
print("Ilk 3000 karakter:")
print(resp.text[:3000])

# Eger JSON ise, kac kayit geldigini ve ilk kaydin TUM alanlarini goster
try:
    data = resp.json()
    if isinstance(data, list):
        print("\nTOPLAM KAYIT SAYISI:", len(data))
        print("\nILK KAYDIN TUM ALANLARI:")
        print(json.dumps(data[0], ensure_ascii=False, indent=2))
    elif isinstance(data, dict):
        print("\nSOZLUK ANAHTARLARI:", list(data.keys()))
except Exception as e:
    print("JSON parse edilemedi:", e)
