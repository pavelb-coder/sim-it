@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

rem ===========================================================================
rem  Тренажёры IT-квантума — запуск на Windows.
rem
rem  start.bat            локальный сервер на 8087 + браузер
rem  start.bat 8090       то же на другом порту
rem  start.bat file       без сервера: открыть index.html как файл
rem  start.bat --check    диагностика (результат в start-log.txt)
rem
rem  Окно больше не закрывается молча: в конце всегда пауза,
rem  а все шаги пишутся в start-log.txt рядом со скриптом.
rem ===========================================================================

set "ROOT=%~dp0"
set "LOG=%ROOT%start-log.txt"
set "PORT=%1"
if "%PORT%"=="" set "PORT=8087"

if /i "%PORT%"=="file" goto openfile
if "%PORT%"=="--check" goto check
if "%PORT%"=="-c" goto check

echo ============================================================
echo   Тренажёры IT-квантума
echo   папка: %ROOT%
echo   порт:  %PORT%
echo ============================================================
echo.

call :log "=== %DATE% %TIME% ==="
call :log "папка: %ROOT%"
call :log "порт: %PORT%"

rem --- 0. проверка, что архив распакован и файлы на месте ---------------
if not exist "%ROOT%index.html" (
  echo [ОШИБКА] В этой папке нет index.html.
  echo          Похоже, архив открыт внутри программы-просмотрщика,
  echo          а не распакован. Щёлкните по ZIP правой кнопкой -
  echo          "Извлечь всё", затем запустите start.bat из распакованной папки.
  call :log "нет index.html в %ROOT%"
  goto fail
)

rem --- 1. Python через лаунчер py (заглушка из Microsoft Store не считается) --
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -c "import sys" >nul 2>&1
  if !errorlevel!==0 goto use_py
)

rem --- 2. Python в PATH -------------------------------------------------------
where python >nul 2>nul
if %errorlevel%==0 (
  python -c "import sys" >nul 2>&1
  if !errorlevel!==0 goto use_python
)

goto use_powershell

:use_py
call :log "сервер: py -3 tools\\serve.py"
py -3 tools\serve.py %PORT%
set "RC=!errorlevel!"
call :log "serve.py завершился с кодом !RC!"
if not "!RC!"=="0" goto hint
goto end

:use_python
call :log "сервер: python tools\\serve.py"
python tools\serve.py %PORT%
set "RC=!errorlevel!"
call :log "serve.py завершился с кодом !RC!"
if not "!RC!"=="0" goto hint
goto end

:use_powershell
echo Python не найден — поднимаю сервер на PowerShell (без прав администратора).
call :log "сервер: powershell tools\\serve.ps1 -Port %PORT%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%tools\serve.ps1" -Port %PORT%
set "RC=!errorlevel!"
call :log "serve.ps1 завершился с кодом !RC!"
if not "!RC!"=="0" goto psfail
goto end

:psfail
echo.
echo [ОШИБКА] Сервер на PowerShell не запустился (код !RC!).
echo          Тренажёры всё равно работают: открываю каталог как обычный файл.
echo          Подробности: %LOG%
call :log "powershell-сервер не запустился"
goto openfile

:hint
echo.
echo [ВНИМАНИЕ] Сервер завершился. Если окно было открыто двойным щелчком,
echo            проверьте сообщение выше или выполните start.bat --check.
echo            Можно вообще без сервера: open.bat
goto end

:check
echo Диагностика окружения…
echo.
if exist "%ROOT%tools\serve.py" (
  where py >nul 2>nul
  if !errorlevel!==0 (
    py -3 tools\serve.py --check
    goto checkdone
  )
  where python >nul 2>nul
  if !errorlevel!==0 (
    python tools\serve.py --check
    goto checkdone
  )
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%tools\serve.ps1" -Check
:checkdone
goto end

:openfile
echo.
echo ============================================================
echo   Открываю каталог тренажёров как файл: index.html
echo   Сервер и интернет не нужны — всё работает локально.
echo ============================================================
if exist "%ROOT%index.html" (
  start "" "%ROOT%index.html"
) else (
  echo [ОШИБКА] index.html не найден. Соберите сайт: python3 build_site.py
  goto fail
)
goto end

:fail
echo.
echo Готово с ошибкой. Строки выше и файл start-log.txt помогут разобраться.
goto end

:end
echo.
echo Окно можно закрыть. Если что-то не открылось — пришлите start-log.txt.
pause
endlocal
exit /b 0

:log
>> "%LOG%" echo %~1
exit /b 0
