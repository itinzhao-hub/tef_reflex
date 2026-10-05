@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  set PY=py
) else (
  set PY=python
)
start "TEF Reflex Server" cmd /k "%PY% -m http.server 8765"
timeout /t 1 /nobreak >nul
start "" "http://localhost:8765"
endlocal
