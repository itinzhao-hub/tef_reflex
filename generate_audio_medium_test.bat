@echo off
cd /d "%~dp0"
python tools\generate_audio.py --ids MI061_cb1768f18650 MI061_3aa5f0d4111e MI061_1b4443a562bc MI061_58e913a0246a MI061_63f518f43aba
if errorlevel 1 (
  echo Audio generation failed.
  pause
  exit /b 1
)
python tools\build.py
python tools\verify_audio.py
pause
