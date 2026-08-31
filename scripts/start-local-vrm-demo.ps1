Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendEnv = Join-Path $repoRoot ".env"
$frontendEnv = Join-Path $repoRoot "frontend\.env.local"
$backendPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
$frontendUrl = "http://127.0.0.1:5175"
$backendUrl = "http://127.0.0.1:8001"

function Test-PortFree {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($listener) {
    Write-Warning "$Name port $Port is already in use. Stop the old process before starting VitaKiosk again."
    $listener | Select-Object LocalAddress,LocalPort,OwningProcess | Format-Table
    Write-Host "To inspect this port again:"
    Write-Host "Get-NetTCPConnection -LocalPort $Port -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess"
    Write-Host "Stop the process only after you confirm it is the old VitaKiosk server:"
    Write-Host "Stop-Process -Id <PID> -Force"
    exit 1
  }
}

function Test-EnvLine {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Line,
    [Parameter(Mandatory = $true)]
    [string]$Description
  )

  $content = Get-Content -LiteralPath $Path -ErrorAction Stop
  if ($content -notcontains $Line) {
    Write-Warning "$Description is missing or different in $Path."
    Write-Host "Expected line:"
    Write-Host $Line
    exit 1
  }
}

Write-Host "VitaKiosk fixed local VRM demo startup"
Write-Host "Backend:  $backendUrl"
Write-Host "Frontend: $frontendUrl"
Write-Host "Avatar:   VITE_AVATAR_RENDERER=vrm, VITE_VRM_MODEL=vita-new"
Write-Host "Backend port check:  Get-NetTCPConnection -LocalPort 8001 -State Listen"
Write-Host "Frontend port check: Get-NetTCPConnection -LocalPort 5175 -State Listen"
Write-Host ""

if (-not (Test-Path -LiteralPath $backendEnv)) {
  Write-Warning "root .env was not found. Create it from .env.local.example before starting the local Ollama/faster-whisper backend profile."
  Write-Host "This helper does not create or modify .env and does not print secrets."
  exit 1
}

if (-not (Test-Path -LiteralPath $frontendEnv)) {
  Write-Warning "frontend/.env.local was not found. Create it from frontend/.env.local.example so Vite starts with VRM settings after a PC restart."
  Write-Host "Vite reads frontend/.env.local only when the dev server starts."
  Write-Host "This helper does not create or modify frontend/.env.local."
  exit 1
}

if (-not (Test-Path -LiteralPath $backendPython)) {
  Write-Warning "The project Python runtime was not found at .venv\Scripts\python.exe. Create the backend virtual environment and install its dependencies before starting VitaKiosk."
  exit 1
}

Test-EnvLine -Path $frontendEnv -Line "VITE_AVATAR_RENDERER=vrm" -Description "VRM renderer config"
Test-EnvLine -Path $frontendEnv -Line "VITE_VRM_MODEL=vita-new" -Description "VRM model config"
Test-EnvLine -Path $frontendEnv -Line "VITE_API_BASE_URL=http://127.0.0.1:8001" -Description "Frontend API base URL"
Test-EnvLine -Path $frontendEnv -Line "VITE_WS_BASE_URL=ws://127.0.0.1:8001" -Description "Frontend WebSocket base URL"
Test-EnvLine -Path $frontendEnv -Line "VITE_TEXT_INPUT_MODE=native" -Description "Frontend text input mode"

Test-PortFree -Port 8001 -Name "Backend"
Test-PortFree -Port 5175 -Name "Frontend"

$backendCommand = "cd `"$repoRoot`"; & `"$backendPython`" -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001"
$frontendCommand = "cd `"$repoRoot`"; npm.cmd run dev:vrm --prefix frontend"

Write-Host "Starting backend on 127.0.0.1:8001..."
Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $backendCommand) -WorkingDirectory $repoRoot

Write-Host "Starting frontend on 127.0.0.1:5175 with Vite strict port mode..."
Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $frontendCommand) -WorkingDirectory $repoRoot

Write-Host ""
Write-Host "Open $frontendUrl after both terminals finish starting."
Write-Host "If the browser shows Lottie/hologram, stop the old 5175 dev server and run this script again."
Write-Host "No secrets were printed or modified by this helper."
