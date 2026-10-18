@echo off
rem Lance Zones en mode developpement, sans dependre du PATH du terminal.
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
set ELECTRON_RUN_AS_NODE=
if not exist node_modules call npm.cmd install
call npm.cmd run dev
pause
