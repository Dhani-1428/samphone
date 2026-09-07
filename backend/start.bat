@echo off
REM Start Samphone backend (kills stale process on port 8000 first)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
  echo Stopping old server PID %%a...
  taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul
echo Starting backend on http://localhost:8000
python -m uvicorn server:app --host 0.0.0.0 --port 8000
