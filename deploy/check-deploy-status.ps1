<#
.SYNOPSIS
  Seguimiento rapido del CI/CD y del ultimo deploy a production (NSSM).

.DESCRIPTION
  Usa GitHub CLI (`gh`) para listar runs de ci-cd.yml en main/preprod y el
  ultimo deployment del environment production. Opcionalmente compara
  origin/main con el SHA del ultimo deployment.

.EXAMPLE
  .\deploy\check-deploy-status.ps1
  .\deploy\check-deploy-status.ps1 -CompareMain
#>
[CmdletBinding()]
param(
  [switch]$CompareMain
)

$ErrorActionPreference = "Stop"

function Assert-Gh {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "Se requiere GitHub CLI (gh). Instalar: https://cli.github.com/"
  }
  gh auth status 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "gh no autenticado. Ejecutar: gh auth login"
  }
}

Assert-Gh

Write-Host ""
Write-Host "=== CI/CD Pipeline (ci-cd.yml) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "-- main (incluye deploy NSSM) --"
gh run list --workflow=ci-cd.yml --branch main --limit 5
Write-Host ""
Write-Host "-- preprod (solo CI, sin deploy) --"
gh run list --workflow=ci-cd.yml --branch preprod --limit 5

Write-Host ""
Write-Host "=== Deployments: production ===" -ForegroundColor Cyan
$deployJson = gh api "repos/{owner}/{repo}/deployments?environment=production&per_page=1" | ConvertFrom-Json
if (-not $deployJson -or $deployJson.Count -eq 0) {
  Write-Host "No hay deployments registrados en production."
  exit 0
}

$dep = $deployJson[0]
$sha = $dep.sha
$short = $sha.Substring(0, [Math]::Min(7, $sha.Length))
Write-Host ("Deployment id: {0}" -f $dep.id)
Write-Host ("Ref:           {0}" -f $dep.ref)
Write-Host ("SHA:           {0} ({1})" -f $short, $sha)
Write-Host ("Created:       {0}" -f $dep.created_at)

$statuses = gh api $dep.statuses_url | ConvertFrom-Json
if ($statuses -and $statuses.Count -gt 0) {
  $st = $statuses[0]
  Write-Host ("State:         {0}" -f $st.state) -ForegroundColor $(if ($st.state -eq "success") { "Green" } else { "Yellow" })
  if ($st.log_url) { Write-Host ("Log:           {0}" -f $st.log_url) }
  if ($st.description) { Write-Host ("Description:   {0}" -f $st.description) }
}

if ($CompareMain) {
  Write-Host ""
  Write-Host "=== Comparacion origin/main vs deployment ===" -ForegroundColor Cyan
  git fetch origin main --quiet 2>$null
  $mainSha = (git rev-parse origin/main).Trim()
  Write-Host ("origin/main:   {0}" -f $mainSha.Substring(0, 7))
  Write-Host ("deployed:      {0}" -f $short)
  if ($mainSha -eq $sha) {
    Write-Host "OK: production apunta al mismo SHA que origin/main." -ForegroundColor Green
  } else {
    Write-Host "DIFF: main y production no coinciden." -ForegroundColor Yellow
    git log --oneline "$sha..origin/main" 2>$null | Select-Object -First 15
  }
}

Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor DarkGray
Write-Host "  gh run list --workflow=ci-cd.yml --branch main --limit 5"
Write-Host "  gh run view <run-id>"
Write-Host "  gh api repos/:owner/:repo/deployments?environment=production&per_page=3"
Write-Host "  .\deploy\check-deploy-status.ps1 -CompareMain"
