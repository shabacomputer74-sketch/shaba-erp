@echo off
setlocal
set "ROOT=%~dp0"
set "SRC=%ROOT%ERP_DATA"
set "DEST=%ROOT%BACKUPS\ERP_BACKUP_%date:~-4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%"
set "DEST=%DEST: =0%"
if not exist "%SRC%" (
  echo ERP_DATA folder not found.
  pause
  exit /b 1
)
mkdir "%DEST%" 2>nul
xcopy "%SRC%" "%DEST%" /E /I /H /Y >nul
if errorlevel 1 (
  echo Backup failed.
) else (
  echo Backup completed:
  echo %DEST%
)
pause
