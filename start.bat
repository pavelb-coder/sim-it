@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set PORT=%1
if "%PORT%"=="" set PORT=8087

if "%PORT%"=="--check" (
  where py >nul 2>nul && (py -3 tools\serve.py --check & goto :end)
  where python >nul 2>nul && (python tools\serve.py --check & goto :end)
  echo Python не найден — проверка окружения недоступна, сервер поднимется через PowerShell.
  goto :end
)

echo ============================================================
echo   Python-класс - тренажёр IT-квантума
echo   порт: %PORT%
echo ============================================================

rem 1) Python через лаунчер py
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 tools\serve.py %PORT%
  goto :end
)

rem 2) Python в PATH
where python >nul 2>nul
if %errorlevel%==0 (
  python tools\serve.py %PORT%
  goto :end
)

rem 3) PowerShell-сервер, если Python не установлен
echo Python не найден - запускаю встроенный сервер PowerShell.
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\serve.ps1" -Port %PORT%
if %errorlevel%==0 goto :end

rem 4) совсем без сервера: открыть файл напрямую
echo Не удалось запустить сервер - открываю тренажёр как файл.
echo Диагностика: start.bat --check
start "" "python-class\dist\python-class.html"

:end
endlocal
