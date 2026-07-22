@echo off
REM ============================================================
REM  YTBS Kurulu Guc - otomatik guncelleme + GitHub'a gonderme
REM  Bu dosyayi backend klasorune koy (app.py ile ayni yere).
REM  Gorev Zamanlayicisi bu .bat dosyasini calistiracak.
REM ============================================================

cd /d "%~dp0"

echo ============================================== >> guncelleme_log.txt
echo %date% %time% - Baslatildi >> guncelleme_log.txt

python ytbs_kurulu_guc_guncelle.py >> guncelleme_log.txt 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo %date% %time% - HATA: python scripti basarisiz oldu, push yapilmiyor >> guncelleme_log.txt
    exit /b 1
)

git add kurulu_guc_guncel.json >> guncelleme_log.txt 2>&1
git commit -m "otomatik: kurulu guc guncellendi (%date%)" >> guncelleme_log.txt 2>&1
git push >> guncelleme_log.txt 2>&1

echo %date% %time% - Tamamlandi >> guncelleme_log.txt
echo. >> guncelleme_log.txt
