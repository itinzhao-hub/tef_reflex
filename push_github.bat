@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ============================================================
rem TEF Reflex Trainer - GitHub push helper
rem Usage:
rem   1) Put this .bat in the ROOT of your local Git repository.
rem   2) Double-click it, or run:
rem        push_github.bat "your commit message"
rem ============================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo   TEF Reflex Trainer - GitHub Push
echo ============================================================
echo.

rem --- Check Git ------------------------------------------------
where git >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Git was not found in PATH.
    echo Install Git for Windows, then reopen this window.
    pause
    exit /b 1
)

rem --- Check repository -----------------------------------------
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
    echo [ERROR] This folder is not a Git repository:
    echo         %CD%
    echo.
    echo Put push_github.bat in the repository root and try again.
    pause
    exit /b 1
)

rem --- Check remote ---------------------------------------------
git remote get-url origin >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No Git remote named "origin" is configured.
    echo Example first-time setup:
    echo   git remote add origin https://github.com/USERNAME/REPOSITORY.git
    echo.
    pause
    exit /b 1
)

rem --- Resolve current branch -----------------------------------
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not defined BRANCH (
    echo [ERROR] Could not determine the current Git branch.
    pause
    exit /b 1
)

echo Repository : %CD%
echo Branch     : %BRANCH%
for /f "delims=" %%R in ('git remote get-url origin') do echo Remote     : %%R
echo.

rem --- Show status ----------------------------------------------
echo [1/5] Checking changes...
git status --short

git diff --quiet && git diff --cached --quiet
if not errorlevel 1 (
    echo.
    echo [INFO] No local changes to commit.
    echo [INFO] Trying to push any existing local commits anyway...
    goto :PUSH
)

rem --- Stage -----------------------------------------------------
echo.
echo [2/5] Staging all changes...
git add -A
if errorlevel 1 goto :FAIL

rem --- Commit message -------------------------------------------
set "MSG=%~1"
if not defined MSG (
    set /p "MSG=Commit message [Update TEF Reflex Trainer]: "
)
if not defined MSG set "MSG=Update TEF Reflex Trainer"

rem --- Commit ----------------------------------------------------
echo.
echo [3/5] Creating commit...
git commit -m "%MSG%"
if errorlevel 1 (
    rem git commit returns non-zero if there is nothing staged.
    git diff --cached --quiet
    if errorlevel 1 goto :FAIL
    echo [INFO] Nothing new to commit. Continuing to push...
)

:PUSH
rem --- Pull/rebase first ----------------------------------------
echo.
echo [4/5] Syncing with origin/%BRANCH% using rebase...
git pull --rebase origin "%BRANCH%"
if errorlevel 1 (
    echo.
    echo [ERROR] Pull/rebase failed.
    echo If Git reports a conflict, resolve it first, then run this script again.
    pause
    exit /b 1
)

rem --- Push ------------------------------------------------------
echo.
echo [5/5] Pushing to GitHub...
git push -u origin "%BRANCH%"
if errorlevel 1 goto :FAIL

echo.
echo ============================================================
echo [SUCCESS] GitHub push completed.
echo Branch: %BRANCH%
echo ============================================================
echo.
pause
exit /b 0

:FAIL
echo.
echo ============================================================
echo [ERROR] Git operation failed. Review the message above.
echo ============================================================
echo.
pause
exit /b 1
