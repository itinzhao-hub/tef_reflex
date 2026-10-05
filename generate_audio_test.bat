@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (set PY=py) else (set PY=python)
echo.
echo TEF Reflex Core 0.3 - NEW SOURCE audio test
echo Generates 5 v0.3 source units x 4 variants = 20 MP3 files.
echo API key is requested at runtime and is NOT saved.
echo.
%PY% tools\generate_audio.py --ids X1_HOMELESS X2_SCREENS X3_MIGRAINE X4_RIGHT_REPAIR X6_TELEWORK
if errorlevel 1 goto :fail
%PY% tools\build.py
if errorlevel 1 goto :fail
echo.
echo Test audio generation completed.
pause
exit /b 0
:fail
echo.
echo Audio generation failed. Review the message above.
pause
exit /b 1
