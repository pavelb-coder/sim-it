@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

rem ===========================================================================
rem  Запуск тренажёров IT-квантума на Windows.
rem
rem  start.bat            поднять локальный сервер на 8087 и открыть браузер
rem  start.bat 8090       то же на другом порту
rem  start.bat file       без сервера: открыть каталог index.html как файл
rem  start.bat --check    диагностика: порт, localhost, прокси
rem
rem  Тренажёры работают и без сервера — достаточно открыть index.html.
rem ===========================================================================

set PORT=%1
if "%PORT%"=="" set PORT=8087

if /i "%PORT%"=="file" goto openfile
if "%PORT%"=="--check" goto check
if "%PORT%"=="-c" goto check

echo ============================================================
echo   Тренажёры IT-квантума
echo   порт: %PORT%
echo ============================================================

rem --- выбор движка сервера: py -> python -> PowerShell ----------------------
where py >nul 2>nul
if %errorlevel%==0 goto use_py

where python >nul 2>nul
if %errorlevel%==0 goto use_python

goto use_powershell

:use_py
py -3 tools\serve.py %PORT%
if errorlevel 1 goto hint
goto end

:use_python
python tools\serve.py %PORT%
if errorlevel 1 goto hint
goto end

:use_powershell
echo Python не найден — поднимаю сервер на PowerShell (без прав администратора).
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\serve.ps1" -Port %PORT%
if errorlevel 1 goto psfail
goto end

:psfail
echo.
echo Не удалось поднять сервер на этом компьютере.
echo Тренажёры всё равно работают: открываю каталог как обычный файл.
goto openfile

:hint
echo.
echo Сервер завершился. Если окно закрылось сразу — смотрите сообщение выше.
echo   start.bat --check   диагностика: порт, localhost, прокси
echo   start.bat file      открыть тренажёры вообще без сервера
goto end

:check
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 tools\serve.py --check
  goto end
)
where python >nul 2>nul
if %errorlevel%==0 (
  python tools\serve.py --check
  goto end
)
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\serve.ps1" -Check
goto end

:openfile
echo.
echo ============================================================
echo   Открываю каталог тренажёров как файл: index.html
echo   Сервер и интернет не нужны — всё работает локально.
echo   В каталоге карточки ведут на python/index.html и остальные.
echo ============================================================
if exist "index.html" (
  start "" "index.html"
) else (
  echo Файл index.html не найден. Соберите сайт: python3 build_site.py
  pause
)
goto end

:end
endlocal
