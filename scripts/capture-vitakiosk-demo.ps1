param(
  [string]$FrontendUrl = "http://127.0.0.1:5175",
  [string]$BackendUrl = "http://127.0.0.1:8001",
  [string]$OutputDir = "tmp/site-captures/vitakiosk"
)

$ErrorActionPreference = "Stop"

function Test-UrlReady {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

if (-not (Test-UrlReady "$BackendUrl/health")) {
  throw "Backend is not ready at $BackendUrl. Start the VitaKiosk backend on port 8001 first."
}

if (-not (Test-UrlReady $FrontendUrl)) {
  throw "Frontend is not ready at $FrontendUrl. Start the VitaKiosk frontend on port 5175 first."
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw "npm.cmd is required for Playwright capture."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$resolvedOutput = (Resolve-Path $OutputDir).Path.Replace("\", "/")
$tempScript = Join-Path $OutputDir "capture-vitakiosk-demo.cjs"

$captureScript = @"
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 1024 } });
  await page.goto('$FrontendUrl', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '$resolvedOutput/home.png', fullPage: false });

  const queries = [
    ['product-panel.png', 'relief balm'],
    ['fuzzy-search.png', 'relief bomb'],
    ['leaflet.png', 'promotion'],
    ['shelf-map.png', 'where is relief balm']
  ];

  for (const [fileName, text] of queries) {
    const input = page.locator('textarea, input').first();
    if (await input.count()) {
      await input.fill(text);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1200);
    }
    await page.screenshot({ path: '$resolvedOutput/' + fileName, fullPage: false });
  }

  await browser.close();
})();
"@

Set-Content -LiteralPath $tempScript -Value $captureScript -Encoding UTF8
npm.cmd exec --yes --package playwright -- node $tempScript

Write-Host "VitaKiosk capture complete: $OutputDir"
