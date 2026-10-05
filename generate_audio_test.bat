@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (set PY=py) else (set PY=python)
echo.
echo TEF Reflex Core 0.5 Language Mine - audio test
echo Generates 5 newly mined LANGUAGE_CHUNK units x 4 variants = 20 MP3 files.
echo API key is requested at runtime and is NOT saved.
echo.
%PY% tools\generate_audio.py --ids L_N1_01_9b7c172d6b L_N1_01_9eefec5eea L_N1_02_ac2c11cf08 L_N1_02_755e1d1914 C_N1_02_9c30b7cead
if errorlevel 1 goto :fail
%PY% tools\build.py
if errorlevel 1 goto :fail
echo.
echo Test language-mine audio generation completed.
pause
exit /b 0
:fail
echo.
echo Audio generation failed. Review the message above.
pause
exit /b 1
