param(
  [string]$SiteUrl = "http://127.0.0.1:5176",
  [string]$KioskUrl = "http://127.0.0.1:5175",
  [string]$BackendUrl = "http://127.0.0.1:8001",
  [string]$OutDir = "tmp/site-captures/vitakiosk"
)

$ErrorActionPreference = "Stop"

function Test-HttpReady {
  param([string]$Url)
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method Head -TimeoutSec 3
    return $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

$targets = @(
  "home-default",
  "product-panel",
  "promotion-leaflet-enlarged",
  "fuzzy-do-you-mean-relief-balm",
  "product-detail-enlarged",
  "product-summary-enlarged",
  "shelf-navigation",
  "pharmacist-assistance",
  "voice-flow-if-available"
)

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
New-Item -ItemType Directory -Force -Path "tmp/site-video-raw" | Out-Null

Write-Host "VitaKiosk demo capture pipeline"
Write-Host "Site:    $SiteUrl"
Write-Host "Kiosk:   $KioskUrl"
Write-Host "Backend: $BackendUrl"
Write-Host "Output:  $OutDir"

if (-not (Test-HttpReady "$BackendUrl/health")) {
  Write-Warning "Backend is not reachable at $BackendUrl. Start it before capture."
}

if (-not (Test-HttpReady $KioskUrl)) {
  Write-Warning "Kiosk frontend is not reachable at $KioskUrl. Start the 5175 demo before capture."
}

Write-Host "Capture targets:"
foreach ($target in $targets) {
  Write-Host " - $target"
}

Write-Host ""
Write-Host "Use Playwright or the in-app browser to capture these states into $OutDir."
Write-Host "Store raw screen recordings in tmp/site-video-raw/ and do not commit them."
Write-Host "For the public website, keep only apps/site/public/assets/reference/vitakiosk-demo-approved.png as the local VitaKiosk UI reference."
Write-Host "Use fresh captures as review material unless the user explicitly approves committing a specific compressed asset."
Write-Host "Then update apps/site/src/content/demoAssets.ts and apps/site/src/content/interactiveDemoStates.ts if approved filenames or demo states change."
