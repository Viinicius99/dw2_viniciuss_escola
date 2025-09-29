@echo off
setlocal ENABLEDELAYEDEXPANSION

REM One-click start for Windows: create venv, install deps, run backend (serves frontend)

REM Go to project root (this .bat should be at project root)
cd /d "%~dp0"

set VENV_DIR=.venv
set PYTHON=python

REM Detect Python
%PYTHON% --version >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Python nao encontrado no PATH. Instale Python 3.10+ e tente novamente.
  pause
  exit /b 1
)

REM Create venv if not exists
if not exist "%VENV_DIR%\Scripts\python.exe" (
  echo [INFO] Criando ambiente virtual...
  %PYTHON% -m venv "%VENV_DIR%"
)

REM Upgrade pip
call "%VENV_DIR%\Scripts\python.exe" -m pip install --upgrade pip >nul 2>&1

REM Install requirements
if exist backend\requirements.txt (
  echo [INFO] Instalando dependencias...
  call "%VENV_DIR%\Scripts\pip.exe" install -r backend\requirements.txt
) else (
  echo [AVISO] backend\requirements.txt nao encontrado. Pulando instalacao de deps.
)

REM Run backend (serves frontend too)
set PORT=8005
set PYTHONUTF8=1

echo.
echo ==============================================
echo  Backend iniciando em http://127.0.0.1:%PORT%
echo  Frontend: abra http://127.0.0.1:%PORT%/
echo ==============================================
echo.

cd backend
call "..\%VENV_DIR%\Scripts\python.exe" app.py

endlocal
