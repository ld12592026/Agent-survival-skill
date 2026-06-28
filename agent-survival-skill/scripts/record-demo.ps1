$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $root "docs\launch"
$transcript = Join-Path $outputDir "demo-output.txt"

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Push-Location $root
try {
  "### npm run demo" | Set-Content -Path $transcript -Encoding UTF8
  npm.cmd run demo | Tee-Object -FilePath $transcript -Append
  "" | Add-Content -Path $transcript -Encoding UTF8
  "### npm run example:runtime" | Add-Content -Path $transcript -Encoding UTF8
  npm.cmd run example:runtime | Tee-Object -FilePath $transcript -Append
  Write-Host ""
  Write-Host "Demo transcript written to $transcript"
}
finally {
  Pop-Location
}
