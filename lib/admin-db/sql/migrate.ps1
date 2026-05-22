# Apply all admin SQL migrations in order (Windows)
param(
  [string]$DatabaseUrl = $env:DATABASE_URL
)

if (-not $DatabaseUrl) {
  throw "Set DATABASE_URL or pass -DatabaseUrl"
}

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Get-ChildItem -Path $dir -Filter "0*.sql" | Sort-Object Name | ForEach-Object {
  Write-Host "==> $($_.Name)"
  & psql $DatabaseUrl -v ON_ERROR_STOP=1 -f $_.FullName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Admin schema applied."
