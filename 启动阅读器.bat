﻿@echo off
chcp 65001 >nul 2>&1
title Start Look Epub

cd /d "%~dp0"

echo ========================================
echo      Start Look Epub Reader
echo ========================================
echo.

echo Step 1: Starting frontend dev server (port 3000)...
echo.
echo Browser will open automatically after frontend starts
echo If not, please visit: http://localhost:3000
echo.
echo ========================================
echo.

npm run dev