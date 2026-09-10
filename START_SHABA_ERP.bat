@echo off
setlocal
set "ROOT=%~dp0"
set "PROFILE=%ROOT%ERP_DATA\BrowserProfile"
if not exist "%PROFILE%" mkdir "%PROFILE%"
set "ERPFILE=%ROOT%SHABA_COMPUTER_ERP.html"

set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

if not defined BROWSER (
  echo.
  echo Chrome or Microsoft Edge was not found on this PC.
  echo Install Chrome or Edge, then run this file again.
  pause
  exit /b 1
)

start "SHABA COMPUTER ERP" "%BROWSER%" --user-data-dir="%PROFILE%" --app="file:///%ERPFILE:\=/%" --no-first-run --no-default-browser-check
exit /b 0
