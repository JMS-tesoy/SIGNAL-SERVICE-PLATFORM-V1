@echo off
echo ========================================
echo  Railway Production Database Viewer
echo ========================================
echo.
echo IMPORTANT: Make sure you have set the production DATABASE_URL first
echo.
echo Run this command FIRST (in PowerShell):
echo   $env:DATABASE_URL="postgresql://postgres:PASSWORD@HOST:5432/railway"
echo.
echo Then run: npx prisma studio
echo.
echo Replace PASSWORD and HOST with your Railway values
echo ========================================
pause
