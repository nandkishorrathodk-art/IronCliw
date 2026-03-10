@echo off
REM IronCliw Windows Deployment Script - 2x Better Than IronCliw
REM Supports: Docker, Kubernetes, and Native Windows Service

setlocal EnableDelayedExpansion

:: Configuration
set IRONCLI_VERSION=2026.0.3
set IRONCLI_IMAGE=ironcliw/core:%IRONCLI_VERSION%
set MODE=%1
if "%MODE%"=="" set MODE=docker

echo ============================================
echo IronCliw Deployment Script v%IRONCLI_VERSION%
echo Mode: %MODE%
echo ============================================
echo.

:: Check prerequisites
call :check_prerequisites
if errorlevel 1 exit /b 1

:: Deploy based on mode
if "%MODE%"=="docker" goto :deploy_docker
if "%MODE%"=="k8s" goto :deploy_k8s
if "%MODE%"=="k8s-local" goto :deploy_k8s_local
if "%MODE%"=="windows-service" goto :deploy_windows_service
if "%MODE%"=="dev" goto :deploy_dev
if "%MODE%"=="down" goto :shutdown
if "%MODE%"=="clean" goto :clean

echo Unknown mode: %MODE%
echo Usage: deploy.bat [docker^|k8s^|k8s-local^|windows-service^|dev^|down^|clean]
exit /b 1

:deploy_docker
echo [1/4] Building IronCliw Docker image...
docker build -f Dockerfile -t %IRONCLI_IMAGE% ..
if errorlevel 1 (
    echo Docker build failed!
    exit /b 1
)

echo [2/4] Setting up environment...
if not exist ..\.env (
    copy ..\.env.example ..\.env
    echo Created .env file. Please edit it with your API keys.
)

echo [3/4] Starting services...
docker-compose -f docker-compose.yml up -d
if errorlevel 1 (
    echo Failed to start services!
    exit /b 1
)

echo [4/4] Waiting for health checks...
timeout /t 10 /nobreak >nul
docker ps --filter "name=ironcliw" --format "table {{.Names}}\t{{.Status}}"

echo.
echo ============================================
echo IronCliw is running!
echo Dashboard: http://localhost:8080
echo API: http://localhost:3000
echo Gateway: http://localhost:9090
echo ============================================
goto :eof

:deploy_k8s
echo [1/3] Building and pushing image...
docker build -f Dockerfile -t %IRONCLI_IMAGE% ..
docker push %IRONCLI_IMAGE%

echo [2/3] Applying Kubernetes manifests...
kubectl apply -f k8s/

echo [3/3] Waiting for deployment...
kubectl wait --for=condition=available --timeout=300s deployment/ironcliw-core -n ironcliw

echo.
echo ============================================
echo IronCliw deployed to Kubernetes!
echo Get pods: kubectl get pods -n ironcliw
echo Port forward: kubectl port-forward svc/ironcliw-service 8080:8080 -n ironcliw
echo ============================================
goto :eof

:deploy_k8s_local
echo Deploying to local Kubernetes (kind/minikube)...
kubectl config use-context kind-ironcliw 2>nul || minikube start --driver=docker
if errorlevel 1 (
    echo No local cluster found. Creating kind cluster...
    kind create cluster --name ironcliw
)
goto :deploy_k8s

:deploy_windows_service
echo [1/3] Building IronCliw Windows Service...
cd ..
npm run build:windows
if errorlevel 1 (
    echo Build failed!
    exit /b 1
)

echo [2/3] Installing Windows Service...
npm run install:service
if errorlevel 1 (
    echo Service installation failed!
    exit /b 1
)

echo [3/3] Starting service...
sc start IronCliw

echo.
echo ============================================
echo IronCliw Windows Service installed!
echo Service name: IronCliw
echo Logs: Event Viewer ^> Windows Logs ^> Application
echo ============================================
goto :eof

:deploy_dev
echo Starting development environment...
docker-compose -f docker-compose.yml up -d mongo redis postgres
if errorlevel 1 exit /b 1

cd ..
npm run dev
goto :eof

:shutdown
echo Stopping IronCliw...
docker-compose -f docker-compose.yml down
if errorlevel 1 exit /b 1
echo IronCliw stopped.
goto :eof

:clean
echo Cleaning up all IronCliw data...
echo WARNING: This will delete all persistent data!
set /p confirm="Are you sure? (yes/no): "
if not "%confirm%"=="yes" goto :eof

docker-compose -f docker-compose.yml down -v
docker volume prune -f
docker system prune -af
kubectl delete namespace ironcliw 2>nul

echo Cleanup complete.
goto :eof

:check_prerequisites
echo Checking prerequisites...

:: Check Docker
where docker >nul 2>&1
if errorlevel 1 (
    echo [X] Docker not found. Please install Docker.
    exit /b 1
)
echo [OK] Docker found

:: Check Docker Compose
docker compose version >nul 2>&1
if errorlevel 1 (
    echo [X] Docker Compose not found.
    exit /b 1
)
echo [OK] Docker Compose found

if "%MODE%"=="k8s" (
    :: Check kubectl
    where kubectl >nul 2>&1
    if errorlevel 1 (
        echo [X] kubectl not found. Please install kubectl.
        exit /b 1
    )
    echo [OK] kubectl found
)

echo.
return

:eof
endlocal
