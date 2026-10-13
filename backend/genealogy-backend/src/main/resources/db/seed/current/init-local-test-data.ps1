param(
    [string]$HostName = "localhost",
    [int]$Port = 5432,
    [string]$Database = "genealogy",
    [string]$Username = "genealogy",
    [string]$Password = "123456",
    [ValidateSet("local", "dev", "development", "test", "ci", "perf", "performance")]
    [string]$Environment = "local",
    [switch]$ConfirmReset
)

$ErrorActionPreference = "Stop"
if (-not $ConfirmReset) {
    throw "Refusing to reset business data. Re-run with -ConfirmReset after verifying the target database."
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    throw "psql was not found in PATH. Install the PostgreSQL client or add its bin directory to PATH."
}

$seedDir = $PSScriptRoot
$resetScript = Join-Path $seedDir "00_reset_business_data.sql"
$scenarioScript = Join-Path $seedDir "10_seed_current_scenarios.sql"
$verifyScript = Join-Path $seedDir "30_verify_seed_data.sql"
$previousPassword = $env:PGPASSWORD

function Invoke-PsqlFile {
    param([string]$FilePath, [string[]]$ExtraArgs = @())
    $commonArgs = @("-X", "-v", "ON_ERROR_STOP=1", "-h", $HostName, "-p", "$Port", "-U", $Username, "-d", $Database)
    & $psql.Source @commonArgs @ExtraArgs "-f" $FilePath
    if ($LASTEXITCODE -ne 0) {
        throw "psql failed for $FilePath with exit code $LASTEXITCODE"
    }
}

try {
    $env:PGPASSWORD = $Password
    $target = $HostName + ":" + $Port + "/" + $Database
    Write-Host "[1/3] Resetting current business data in $target ..."
    Invoke-PsqlFile -FilePath $resetScript -ExtraArgs @("-v", "environment=$Environment", "-v", "confirm_reset=RESET_CURRENT_GENEALOGY_DATA")

    Write-Host "[2/3] Seeding deterministic local scenarios ..."
    Invoke-PsqlFile -FilePath $scenarioScript

    Write-Host "[3/3] Verifying seed integrity ..."
    Invoke-PsqlFile -FilePath $verifyScript

    Write-Host ""
    Write-Host "Local genealogy test data initialized successfully."
    Write-Host "Frontend: http://localhost:5179"
    Write-Host "Demo password for all accounts: Genealogy@123"
    Write-Host "Accounts: demo_admin, demo_branch_admin, demo_editor, demo_reviewer, demo_viewer"
} finally {
    if ($null -eq $previousPassword) {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    } else {
        $env:PGPASSWORD = $previousPassword
    }
}
