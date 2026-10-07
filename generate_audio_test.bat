@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (set PY=py) else (set PY=python)
echo.
echo TEF Reflex Core 0.6 - NEW audio test
echo Generates 5 newly added authentic OLD-TEF clips x 4 variants = 20 MP3 files.
echo API key is requested at runtime and is NOT saved.
echo.
%PY% tools\generate_audio.py --ids C_O6_8c3be4ddbc C_O6_77d9fec0d2 C_O6_7ef2f5b597 C_O6_beeab27d83 C_O6_62845a204e
if errorlevel 1 goto :fail
%PY% tools\build.py
if errorlevel 1 goto :fail
echo.
echo Test Core 0.6 audio generation completed.
pause
exit /b 0
:fail
echo.
echo Audio generation failed. Review the message above.
pause
exit /b 1
