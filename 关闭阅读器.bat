﻿@echo off
chcp 65001 >nul 2>&1
title Close Look Epub

echo ========================================
echo      Close Look Epub Reader
echo ========================================
echo.

echo Closing all related processes...
echo.

echo Closing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo ========================================
echo      Reader Closed
echo ========================================

pause