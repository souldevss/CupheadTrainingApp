param(
    [ValidatePattern('^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$')]
    [string]$Version = '1.2.3'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$artifactRoot = Join-Path $projectRoot 'artifacts'
$packageName = "CupheadTrainingApp-$Version-win-x64"
$publishDirectory = Join-Path $artifactRoot $packageName

if (Test-Path -LiteralPath $publishDirectory) {
    throw "Output already exists: $publishDirectory. Use a clean checkout or a new version."
}

dotnet publish (Join-Path $projectRoot 'CupheadTrainingApp.csproj') `
    --configuration Release --runtime win-x64 --self-contained true `
    --output $publishDirectory "-p:Version=$Version" `
    -p:DebugType=None -p:DebugSymbols=false
if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed.' }

foreach ($required in @('CupheadTrainingApp.exe', 'Web/app-shell.html', 'Web/autolog.html', 'e_sqlite3.dll')) {
    if (-not (Test-Path -LiteralPath (Join-Path $publishDirectory $required))) {
        throw "Published package is missing $required"
    }
}

Copy-Item -LiteralPath (Join-Path $projectRoot 'README.md') -Destination $publishDirectory
Copy-Item -LiteralPath (Join-Path $projectRoot 'THIRD-PARTY-NOTICES.md') -Destination $publishDirectory
$archive = Join-Path $artifactRoot "$packageName.zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$compression = [IO.Compression.CompressionLevel]::Optimal
if ([Enum]::IsDefined([IO.Compression.CompressionLevel], 'SmallestSize')) {
    $compression = [IO.Compression.CompressionLevel]::SmallestSize
}
[IO.Compression.ZipFile]::CreateFromDirectory($publishDirectory, $archive, $compression, $true)
$hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $packageName.zip" | Set-Content -LiteralPath "$archive.sha256" -Encoding ascii
Write-Host "Package: $archive"

