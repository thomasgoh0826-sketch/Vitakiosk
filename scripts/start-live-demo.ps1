Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendEnv = Join-Path $repoRoot ".env"
$frontendEnv = Join-Path $repoRoot "frontend\.env.local"
$backendPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
$backendUrl = "http://127.0.0.1:8001"
$frontendUrl = "http://127.0.0.1:5175"
$vitaFlowUrl = "http://127.0.0.1:3100"

function Read-EnvPresence {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Name
  )

  foreach ($line in Get-Content -LiteralPath $Path -ErrorAction Stop) {
    if ($line -match "^\s*$([regex]::Escape($Name))\s*=\s*(.*)\s*$") {
      return -not [string]::IsNullOrWhiteSpace($Matches[1])
    }
  }
  return $false
}

function Assert-EnvValue {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Expected
  )

  $matched = $false
  foreach ($line in Get-Content -LiteralPath $Path -ErrorAction Stop) {
    if ($line -match "^\s*$([regex]::Escape($Name))\s*=\s*(.*)\s*$") {
      $matched = $true
      if ($Matches[1].Trim() -ne $Expected) {
        throw "$Name is not set to the approved live-demo value."
      }
      break
    }
  }
  if (-not $matched) {
    throw "$Name is missing from the local configuration."
  }
}

function Wait-HttpReady {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Name,
    [int]$Attempts = 40
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt += 1) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        Write-Host "$Name`: ready"
        return
      }
    } catch {
      Start-Sleep -Milliseconds 750
    }
  }
  throw "$Name did not become ready at $Url."
}

if (-not (Test-Path -LiteralPath $backendEnv)) {
  throw "Root .env is missing. This launcher never creates or modifies secret files."
}
if (-not (Test-Path -LiteralPath $frontendEnv)) {
  throw "frontend/.env.local is missing. This launcher never creates or modifies it."
}
if (-not (Test-Path -LiteralPath $backendPython)) {
  throw "The project Python runtime is missing at .venv\Scripts\python.exe."
}

$requiredSecrets = @("AGNES_API_KEY", "ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID")
foreach ($name in $requiredSecrets) {
  $present = Read-EnvPresence -Path $backendEnv -Name $name
  Write-Host "$name`_present=$($present.ToString().ToLowerInvariant())"
  if (-not $present) {
    throw "$name is missing. Add it directly to the ignored local .env; do not paste it into chat."
  }
}

$approvedProfile = @{
  VITAKIOSK_PROVIDER_MODE = "mock"
  STT_PROVIDER = "elevenlabs"
  TTS_PROVIDER = "elevenlabs"
  AI_PROVIDER = "agnes"
  VISION_PROVIDER = "agnes"
  VITAFLOW_PROVIDER = "readonly_api"
  VITAFLOW_API_BASE_URL = $vitaFlowUrl
}
foreach ($entry in $approvedProfile.GetEnumerator()) {
  Assert-EnvValue -Path $backendEnv -Name $entry.Key -Expected $entry.Value
}

Assert-EnvValue -Path $frontendEnv -Name "VITE_AVATAR_RENDERER" -Expected "vrm"
Assert-EnvValue -Path $frontendEnv -Name "VITE_VRM_MODEL" -Expected "vita-new"
Assert-EnvValue -Path $frontendEnv -Name "VITE_API_BASE_URL" -Expected $backendUrl
Assert-EnvValue -Path $frontendEnv -Name "VITE_WS_BASE_URL" -Expected "ws://127.0.0.1:8001"
Assert-EnvValue -Path $frontendEnv -Name "VITE_BRANCH_ID" -Expected "JK"

try {
  $probe = Invoke-RestMethod -Uri "$vitaFlowUrl/api/vitakiosk/catalog/products/search?branchCode=JK&q=__vitakiosk_readiness_probe_no_match__&limit=1" -TimeoutSec 3
  if ($probe.ok -ne $true) {
    throw "Unexpected VitaFlow response."
  }
  Write-Host "VitaFlow: ready"
} catch {
  throw "VitaFlow ERP is not ready on port 3100. Start VitaFlow before VitaKiosk."
}

if (-not (Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue)) {
  $backendCommand = "Set-Location -LiteralPath `"$repoRoot`"; & `"$backendPython`" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001"
  Start-Process powershell.exe -ArgumentList @("-NoProfile", "-Command", $backendCommand) -WorkingDirectory $repoRoot -WindowStyle Hidden
}
if (-not (Get-NetTCPConnection -LocalPort 5175 -State Listen -ErrorAction SilentlyContinue)) {
  $frontendCommand = "Set-Location -LiteralPath `"$repoRoot`"; npm.cmd run dev:vrm --prefix frontend"
  Start-Process powershell.exe -ArgumentList @("-NoProfile", "-Command", $frontendCommand) -WorkingDirectory $repoRoot -WindowStyle Hidden
}

Wait-HttpReady -Url "$backendUrl/health" -Name "Backend"
Wait-HttpReady -Url $frontendUrl -Name "Frontend"

$status = Invoke-RestMethod -Uri "$backendUrl/api/runtime/status" -TimeoutSec 8
if (
  $status.stt_provider -ne "elevenlabs" -or
  $status.tts_provider -ne "elevenlabs" -or
  $status.ai_provider -ne "agnes" -or
  $status.vision_provider -ne "agnes" -or
  $status.vitaflow_provider -ne "readonly_api" -or
  $status.agnes_reachable -ne $true -or
  $status.vitaflow_reachable -ne $true
) {
  throw "Live provider readiness failed. Check local permissions and provider status; no secret values were printed."
}

Write-Host "Agnes: ready"
Write-Host "Live demo profile: ready"
Write-Host "Open $frontendUrl"
Write-Host "No secrets were printed or modified."
