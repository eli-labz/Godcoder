::[Bat To Exe Converter]
::
::YAwzoRdxOk+EWAnk
::fBw5plQjdG8=
::YAwzuBVtJxjWCl3EqQJgSA==
::ZR4luwNxJguZRRnk
::Yhs/ulQjdF+5
::cxAkpRVqdFKZSDk=
::cBs/ulQjdF+5
::ZR41oxFsdFKZSDk=
::eBoioBt6dFKZSDk=
::cRo6pxp7LAbNWATEpCI=
::egkzugNsPRvcWATEpCI=
::dAsiuh18IRvcCxnZtBJQ
::cRYluBh/LU+EWAnk
::YxY4rhs+aU+JeA==
::cxY6rQJ7JhzQF1fEqQJQ
::ZQ05rAF9IBncCkqN+0xwdVs0
::ZQ05rAF9IAHYFVzEqQJQ
::eg0/rx1wNQPfEVWB+kM9LVsJDGQ=
::fBEirQZwNQPfEVWB+kM9LVsJDGQ=
::cRolqwZ3JBvQF1fEqQJQ
::dhA7uBVwLU+EWDk=
::YQ03rBFzNR3SWATElA==
::dhAmsQZ3MwfNWATElA==
::ZQ0/vhVqMQ3MEVWAtB9wSA==
::Zg8zqx1/OA3MEVWAtB9wSA==
::dhA7pRFwIByZRRnk
::Zh4grVQjdCuDJHituWM3LRVAXzilM2+ZCbEZ+qX27uOJnkoSUOEwfIrJlLGWJYA=
::YB416Ek+ZG8=
::
::
::978f952a14a936cc963da21a135fa983
@echo off
setlocal enableextensions
title Godcoder

REM ---------------------------------------------------------------------------
REM Godcoder launcher
REM Double-click this file (or run it from any prompt) to start the desktop app.
REM It starts the Vite frontend dev server and the native Tauri window.
REM The first run after a clean compiles the Rust backend; later runs are fast.
REM ---------------------------------------------------------------------------

REM Ensure Cargo (Rust) is on PATH even if it isn't configured globally.
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

REM Verify cargo is available before doing anything else.
where cargo >nul 2>nul
if errorlevel 1 (
    echo [Godcoder] Could not find "cargo". Install Rust from https://rustup.rs
    echo            or make sure cargo.exe is in "%USERPROFILE%\.cargo\bin".
    pause
    exit /b 1
)

REM Soft checks for the tools the Harness and CoWork self-optimizing modes use.
REM These are warnings only - the app still launches without them, but those two
REM modes need Python (for the ResearchSwarm bridge) and a local model runner.
where python >nul 2>nul || where py >nul 2>nul
if errorlevel 1 (
    echo [Godcoder] Note: Python was not found on PATH. Harness/CoWork modes drive
    echo            the ResearchSwarm bridge via Python - install Python 3.10+ to
    echo            enable their self-optimizing loop. Other modes are unaffected.
)
where ollama >nul 2>nul
if errorlevel 1 (
    echo [Godcoder] Note: Ollama was not found on PATH. To run the bundled local
    echo            model, install it from https://ollama.com and pull a model,
    echo            e.g.  ollama pull qwen2.5-coder:7b-instruct
)

REM Move to the desktop app folder, relative to this script's location.
cd /d "%~dp0apps\desktop"

REM First-run convenience: install frontend dependencies if they're missing so a
REM fresh clone launches without a manual "npm install" step.
if not exist "node_modules" (
    echo [Godcoder] Installing frontend dependencies, first run only...
    call npm install
    if errorlevel 1 (
        echo [Godcoder] "npm install" failed. Install Node.js 18+ from https://nodejs.org
        pause
        exit /b 1
    )
)

REM Development mode (loads frontend from the local Vite dev server).
set "APP_ENV=development"

echo [Godcoder] Starting... a native window will open once the build finishes.
call npx tauri dev

echo.
echo [Godcoder] The app has exited.
pause
