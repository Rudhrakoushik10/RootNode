@echo off
cd /d J:\minisih\RootNode\projects\RootNode-backend
start "Backend" cmd /c "npm run dev"

cd /d J:\minisih\RootNode\projects\RootNode-mock-provider  
start "MockProvider" cmd /c "npm run dev"

timeout /t 5 /nobreak > nul

curl -X POST http://localhost:3001/api/task -H "Content-Type: application/json" -d "{\"task\":\"Get weather for London\"}"