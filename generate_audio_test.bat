@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (set PY=py) else (set PY=python)
echo.
echo TEF Reflex Core 0.4 Clip - audio test
echo Generates 5 clip units x 4 variants = 20 MP3 files.
echo API key is requested at runtime and is NOT saved.
echo.
%PY% tools\generate_audio.py --ids C_N1_01_f04ecfb9ba C_N1_02_2206d1039f C_N1_03_605819f5dd C_N1_04_b3c32522c0 C_N1_05_5c9cd9f309
if errorlevel 1 goto :fail
%PY% tools\build.py
if errorlevel 1 goto :fail
echo.
echo Test clip audio generation completed.
pause
exit /b 0
:fail
echo.
echo Audio generation failed. Review the message above.
pause
exit /b 1
