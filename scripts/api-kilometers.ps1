# ============================================================
# API Kilómetros - Consulta hitos kilométricos
# Uso: .\api-kilometers.ps1
#      .\api-kilometers.ps1 -Token "eyJ..."
#      .\api-kilometers.ps1 -ActiveOnly
# ============================================================

param(
    [string]$BaseUrl = "http://10.1.0.136:3002",
    [string]$Token = $env:JWT_TOKEN,
    [switch]$ActiveOnly = $true,
    [string]$GroupId,
    [string]$Search,
    [int]$Limit,
    [int]$Offset
)

$uri = "$BaseUrl/api/kilometers"
$query = @()
if ($ActiveOnly) { $query += "active=true" }
if ($GroupId)    { $query += "group_id=$GroupId" }
if ($Search)    { $query += "search=$([uri]::EscapeDataString($Search))" }
if ($Limit)     { $query += "limit=$Limit" }
if ($Offset)    { $query += "offset=$Offset" }
if ($query.Count -gt 0) { $uri += "?" + ($query -join "&") }

$headers = @{
    "Accept"       = "application/json"
    "Content-Type" = "application/json"
}
if ($Token) { $headers["Authorization"] = "Bearer $Token" }

Invoke-RestMethod -Uri $uri -Method Get -Headers $headers | ConvertTo-Json -Depth 10
