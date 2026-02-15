﻿@echo off
chcp 65001 >nul 2>&1
title Restart Look Epub

echo ========================================
echo      Restart Look Epub Reader
echo ========================================
echo.

echo Step 1: Closing running services...
echo.

echo Closing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

timeout /t 2 /nobreak >nul

echo Closing complete
echo.
echo ========================================
echo Step 2: Starting frontend service
echo ========================================
echo.

cd /d "%~dp0"

echo Starting frontend dev server (port 3000)...
echo.
echo Browser will open automatically after frontend starts
echo If not, please visit: http://localhost:3000
echo.
echo ========================================
echo.

npm run dev