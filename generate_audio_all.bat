@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (set PY=py) else (set PY=python)
echo.
echo TEF Reflex Core 0.4 Clip - FULL / INCREMENTAL audio generation
echo Expected library: 267 clip units x 4 variants = 1068 MP3 files.
echo Clip MP3s live under audio\clips\ and are exact excerpts of your TEF transcripts.
echo Existing matching clip files are skipped by fingerprint.
echo API key is requested at runtime and is NOT saved.
echo.
%PY% tools\generate_audio.py
if errorlevel 1 goto :fail
%PY% tools\build.py
if errorlevel 1 goto :fail
%PY% tools\verify_audio.py
if errorlevel 1 goto :fail
echo.
echo Full clip audio generation completed.
pause
exit /b 0
:fail
echo.
echo Audio generation failed. You can rerun this file; completed files will be skipped.
pause
exit /b 1
