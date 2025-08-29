param(
  [string[]]$Files = @('mmp_calendar_app.html'),
  [string]$BackupDir = 'backups',
  [switch]$NoGit
)

$ErrorActionPreference = 'Stop'

# Ensure backup directory exists
if (!(Test-Path -LiteralPath $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Create timestamp
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'

# Snapshot files
$backedUp = @()
foreach ($f in $Files) {
  if (Test-Path -LiteralPath $f) {
    $name = Split-Path -Leaf $f
    $base = [System.IO.Path]::GetFileNameWithoutExtension($name)
    $ext  = [System.IO.Path]::GetExtension($name)
    if (-not $ext) { $ext = '' }
    $destName = "$base.$ts$ext"
    $destPath = Join-Path $BackupDir $destName
    Copy-Item -LiteralPath $f -Destination $destPath -Force
    Write-Host "Backed up $f -> $destPath"
    $backedUp += $destPath
  } else {
    Write-Warning "Missing file: $f"
  }
}

# Optionally commit to Git
if (-not $NoGit) {
  try {
    if ($backedUp.Count -gt 0) {
      git add $BackupDir | Out-Null
      git commit -m ("backup: snapshot $ts") | Out-Null
      Write-Host "Committed backup snapshot $ts"
    }
  } catch {
    Write-Warning ("Git commit failed: " + $_.Exception.Message)
  }
}
