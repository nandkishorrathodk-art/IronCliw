@echo off
if "%~1"=="--version" (
  echo 2026.0.1
  exit /b 0
)
node "%~dp0dist\index.js" %*
