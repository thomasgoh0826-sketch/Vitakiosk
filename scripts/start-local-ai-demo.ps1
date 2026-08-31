Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
$frontendEnv = Join-Path $repoRoot "frontend\.env.local"
$backendEnv = Join-Path $repoRoot ".env"

Write-Host "VitaKiosk local AI + VRM demo profile"
Write-Host "Backend: faster-whisper + Ollama on http://127.0.0.1:8001"
Write-Host "Frontend: VRM avatar on http://127.0.0.1:5175"
Write-Host ""

if (-not (Test-Path -LiteralPath $backendEnv)) {
  Write-Warning "Create root .env from .env.local.example before starting the backend profile."
  Write-Host "Required backend .env values include STT_PROVIDER=faster_whisper and AI_PROVIDER=ollama."
  exit 1
}

if (-not (Test-Path -LiteralPath $frontendEnv)) {
  Write-Warning "frontend/.env.local was not found. The dev:vrm helper injects the VRM values for this run, but create frontend/.env.local from frontend/.env.local.example for repeatable manual starts."
}

$backendPort = Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue
if ($backendPort) {
  Write-Warning "Port 8001 is already in use. Close the old backend process before starting a fresh local AI demo."
  $backendPort | Select-Object LocalAddress,LocalPort,OwningProcess | Format-Table
  exit 1
}

$frontendPort = Get-NetTCPConnection -LocalPort 5175 -State Listen -ErrorAction SilentlyContinue
if ($frontendPort) {
  Write-Warning "Port 5175 is already in use. Close the old frontend dev server before starting a fresh VRM demo."
  $frontendPort | Select-Object LocalAddress,LocalPort,OwningProcess | Format-Table
  exit 1
}

if (-not (Test-Path -LiteralPath $backendPython)) {
  Write-Warning "The project Python runtime was not found at .venv\Scripts\python.exe. Create the backend virtual environment and install its dependencies first."
  exit 1
}

$backendCommand = "cd `"$repoRoot`"; & `"$backendPython`" -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001"
$frontendCommand = "cd `"$repoRoot`"; npm.cmd run dev:vrm --prefix frontend"

Write-Host "Starting backend on 127.0.0.1:8001..."
Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $backendCommand) -WorkingDirectory $repoRoot

Write-Host "Starting frontend on 127.0.0.1:5175..."
Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $frontendCommand) -WorkingDirectory $repoRoot

Write-Host ""
Write-Host "Open http://127.0.0.1:5175 after both terminals finish starting."
Write-Host "No secrets were printed or modified by this helper."
