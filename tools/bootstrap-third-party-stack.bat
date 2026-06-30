@echo off
setlocal enableextensions enabledelayedexpansion

REM ---------------------------------------------------------------------------
REM Brute-force third-party bootstrap for GodCoder.
REM Installs and validates:
REM   1) third_party/ResearchSwarm-master
REM   2) third_party/loop-engineering-main
REM This script is intentionally separate from launch-godcoder.bat.
REM ---------------------------------------------------------------------------

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "REPO_ROOT=%%~fI"

set "RS_DIR=%REPO_ROOT%\third_party\ResearchSwarm-master"
set "LE_DIR=%REPO_ROOT%\third_party\loop-engineering-main"

if not exist "%RS_DIR%\godcoder_harness.py" (
    echo [Bootstrap] Missing ResearchSwarm bridge: "%RS_DIR%\godcoder_harness.py"
    exit /b 1
)
if not exist "%LE_DIR%\package.json" (
    echo [Bootstrap] Missing loop-engineering package.json: "%LE_DIR%\package.json"
    exit /b 1
)

set "PY_CMD="
where python >nul 2>nul
if not errorlevel 1 set "PY_CMD=python"
if not defined PY_CMD (
    where py >nul 2>nul
    if not errorlevel 1 set "PY_CMD=py -3"
)
if not defined PY_CMD (
    echo [Bootstrap] Python 3.10+ is required. Install Python and try again.
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [Bootstrap] npm was not found on PATH. Install Node.js 20+ and try again.
    exit /b 1
)

echo [Bootstrap] Using repo root: "%REPO_ROOT%"
echo [Bootstrap] Using Python command: %PY_CMD%

set "USE_UV_MODULE=0"
where uv >nul 2>nul
if errorlevel 1 (
    echo [Bootstrap] uv not found. Installing uv via pip...
    call %PY_CMD% -m pip install --upgrade uv
    if errorlevel 1 (
        echo [Bootstrap] Failed to install uv.
        exit /b 1
    )
    set "USE_UV_MODULE=1"
)

echo [Bootstrap] Installing ResearchSwarm dependencies...
pushd "%RS_DIR%" >nul
if "%USE_UV_MODULE%"=="1" (
    call %PY_CMD% -m uv sync
) else (
    call uv sync
)
if errorlevel 1 (
    popd >nul
    echo [Bootstrap] ResearchSwarm install failed.
    exit /b 1
)

echo [Bootstrap] Validating ResearchSwarm bridge JSON CLI...
call %PY_CMD% godcoder_harness.py recall --limit 1 >nul
if errorlevel 1 (
    popd >nul
    echo [Bootstrap] ResearchSwarm bridge validation failed.
    exit /b 1
)
popd >nul

echo [Bootstrap] Installing loop-engineering dependencies...
pushd "%LE_DIR%" >nul
call npm install
if errorlevel 1 (
    popd >nul
    echo [Bootstrap] loop-engineering npm install failed.
    exit /b 1
)

echo [Bootstrap] Installing loop-engineering local tool dependencies...
for %%T in (loop-audit loop-init loop-cost loop-sync mcp-server) do (
    pushd "tools\%%T" >nul
    call npm install
    if errorlevel 1 (
        popd >nul
        popd >nul
        echo [Bootstrap] loop-engineering dependency install failed for tools\%%T.
        exit /b 1
    )
    popd >nul
)

echo [Bootstrap] Building loop-engineering local tools...
set "OPTIONAL_BUILD_WARN=0"
for %%T in (loop-audit loop-init loop-cost loop-sync mcp-server) do (
    pushd "tools\%%T" >nul
    call npm run build
    if errorlevel 1 (
        popd >nul
        if /I "%%T"=="loop-sync" (
            popd >nul
            echo [Bootstrap] Required tool build failed for tools\%%T.
            exit /b 1
        ) else (
            echo [Bootstrap] Warning: optional tool build failed for tools\%%T. Continuing.
            set "OPTIONAL_BUILD_WARN=1"
        )
    ) else (
        popd >nul
    )
)
if "%OPTIONAL_BUILD_WARN%"=="1" (
    echo [Bootstrap] Some optional loop-engineering tools failed to build on this machine; continuing with core validation.
)

echo [Bootstrap] Validating loop-engineering state sync CLI...
call node tools\loop-sync\dist\cli.js . >nul
if errorlevel 1 (
    popd >nul
    echo [Bootstrap] loop-sync validation failed.
    exit /b 1
)
popd >nul

echo [Bootstrap] Success. ResearchSwarm and loop-engineering are installed and validated.
exit /b 0
