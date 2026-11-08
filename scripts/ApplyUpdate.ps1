$ErrorActionPreference = 'Stop'
$install = [IO.Path]::GetFullPath($env:CUPHEAD_UPDATE_INSTALL).TrimEnd('\')
$payload = [IO.Path]::GetFullPath($env:CUPHEAD_UPDATE_PAYLOAD).TrimEnd('\')
$exe = Join-Path $install 'CupheadTrainingApp.exe'
$stamp = [Guid]::NewGuid().ToString('N')
$applied = [Collections.Generic.List[object]]::new()
$temporary = [Collections.Generic.List[string]]::new()
$mutex = $null
$locked = $false
$appClosed = $false
$success = $false

function Assert-RegularPath([string]$Path) {
    $item = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    if ($item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw "The update cannot replace a symbolic link or junction: $Path"
    }
}

function Start-TrainingApp {
    $start = [Diagnostics.ProcessStartInfo]::new($exe)
    $start.WorkingDirectory = $install
    $start.UseShellExecute = $false
    $app = [Diagnostics.Process]::Start($start)
    if (!$app) { throw 'The app could not be restarted.' }
    $app.Dispose()
}

try {
    $runningApp = Get-Process -Id ([int]$env:CUPHEAD_UPDATE_PID) -ErrorAction SilentlyContinue
    if ($runningApp -and !$runningApp.WaitForExit(30000)) {
        throw 'The app did not close in time.'
    }
    $appClosed = $true

    $hash = [Security.Cryptography.SHA256]::Create()
    try {
        $installKey = [BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($install.ToUpperInvariant())))
    } finally {
        $hash.Dispose()
    }
    $mutex = [Threading.Mutex]::new($false, "Local\CupheadTrainingAppUpdate-$installKey")
    try { $locked = $mutex.WaitOne(0) }
    catch [Threading.AbandonedMutexException] { $locked = $true }
    if (!$locked) { throw 'An update is already running for this folder.' }

    $stagedExe = Join-Path $payload 'CupheadTrainingApp.exe'
    $newVersion = (Get-Item -LiteralPath $stagedExe).VersionInfo.FileVersion
    $oldVersion = (Get-Item -LiteralPath $exe).VersionInfo.FileVersion
    if ([version]$newVersion -le [version]$oldVersion) {
        throw 'This update is already installed or an even newer version is present.'
    }

    Assert-RegularPath $install
    foreach ($source in Get-ChildItem -LiteralPath $payload -Recurse -File -Force) {
        $relative = $source.FullName.Substring($payload.Length + 1)
        $target = Join-Path $install $relative
        $parent = Split-Path -Parent $target
        for ($path = $parent; $path -ne $install; $path = Split-Path -Parent $path) {
            Assert-RegularPath $path
        }
        Assert-RegularPath $target
        [void][IO.Directory]::CreateDirectory($parent)

        $pending = "$target.$stamp.pending"
        $backup = "$target.$stamp.backup"
        $temporary.Add($pending)
        [IO.File]::Copy($source.FullName, $pending)
        $hadFile = [IO.File]::Exists($target)
        if ($hadFile) {
            [IO.File]::Replace($pending, $target, $backup)
        } else {
            [IO.File]::Move($pending, $target)
        }
        $applied.Add(@{ Target = $target; Backup = $backup; HadFile = $hadFile })
    }
    Start-TrainingApp
    $success = $true
} catch {
    $failure = $_.Exception.Message
    $rollbackErrors = @()
    for ($i = $applied.Count - 1; $i -ge 0; $i--) {
        $change = $applied[$i]
        try {
            if ($change.HadFile) {
                [IO.File]::Replace($change.Backup, $change.Target, "$($change.Target).$stamp.failed")
                Remove-Item -LiteralPath "$($change.Target).$stamp.failed" -ErrorAction SilentlyContinue
            } else {
                [IO.File]::Delete($change.Target)
            }
        } catch { $rollbackErrors += $_.Exception.Message }
    }
    Add-Type -AssemblyName System.Windows.Forms
    $message = "$($env:CUPHEAD_UPDATE_FAILURE)`r`n`r`n$failure"
    if ($rollbackErrors.Count) { $message += "`r`n`r`n" + ($rollbackErrors -join "`r`n") }
    [void][Windows.Forms.MessageBox]::Show($message, 'Cuphead Training App')
    if ($appClosed -and $locked -and !$rollbackErrors.Count) {
        Start-TrainingApp
    }
    exit 1
} finally {
    foreach ($file in $temporary) {
        Remove-Item -LiteralPath $file -ErrorAction SilentlyContinue
    }
    if ($success) {
        foreach ($change in $applied) {
            Remove-Item -LiteralPath $change.Backup -ErrorAction SilentlyContinue
        }
    }
    if ($locked) { $mutex.ReleaseMutex() }
    if ($mutex) { $mutex.Dispose() }

    $stage = [IO.Path]::GetFullPath($PSScriptRoot)
    $temp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
    if ([IO.Path]::GetDirectoryName($stage) -eq $temp -and
        [IO.Path]::GetFileName($stage) -like 'CupheadTrainingApp-update-*') {
        Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
    }
}
