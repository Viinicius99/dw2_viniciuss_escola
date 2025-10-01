@echo off
echo 🚀 Iniciando projeto escola...
echo.

REM Vai para a pasta do projeto
cd /d "%~dp0"

REM Ativa o ambiente virtual
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
) else (
    echo ⚠️ Ambiente virtual não encontrado. Rodando start.bat primeiro...
    call start.bat
    exit /b
)

REM Inicia o backend
echo 📡 Iniciando backend...
cd backend
python app.py

echo.
echo ✅ Para parar o servidor, pressione Ctrl+C
pause