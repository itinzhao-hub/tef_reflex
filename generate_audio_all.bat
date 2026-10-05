@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (set PY=py) else (set PY=python)
echo.
echo TEF Reflex Core 0.3 - FULL / INCREMENTAL audio generation
echo Expected library: 80 source units x 4 variants = 320 MP3 files.
echo Existing unchanged files are skipped by fingerprint, so if your old 200 MP3s are present only the new files will be generated.
echo API key is requested at runtime and is NOT saved.
echo.
%PY% tools\generate_audio.py
if errorlevel 1 goto :fail
%PY% tools\build.py
if errorlevel 1 goto :fail
%PY% tools\verify_audio.py
if errorlevel 1 goto :fail
echo.
echo Full audio generation completed.
pause
exit /b 0
:fail
echo.
echo Audio generation failed. You can rerun this file; completed files will be skipped.
pause
exit /b 1
