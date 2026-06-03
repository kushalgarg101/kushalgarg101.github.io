param(
    [int]$Port = 4000,
    [switch]$SkipRidkInstall
)

$ErrorActionPreference = "Stop"

function Test-CommandExists {
    param([Parameter(Mandatory = $true)][string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Add-ToPathIfExists {
    param([Parameter(Mandatory = $true)][string]$CandidatePath)
    if (Test-Path $CandidatePath) {
        if (-not ($env:PATH -split ";" | Where-Object { $_ -eq $CandidatePath })) {
            $env:PATH = "$CandidatePath;$env:PATH"
        }
    }
}

function Get-LatestRubyBinPath {
    $programsRoot = Join-Path $env:LOCALAPPDATA "Programs"
    if (-not (Test-Path $programsRoot)) {
        return $null
    }

    $rubyInstall = Get-ChildItem $programsRoot -Directory -Filter "Ruby-*-x64" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $rubyInstall) {
        return $null
    }

    return (Join-Path $rubyInstall.FullName "bin")
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "Repo: $repoRoot"

# Prefer current PATH + user Ruby install path.
$latestRubyBin = Get-LatestRubyBinPath
if ($latestRubyBin) {
    Add-ToPathIfExists $latestRubyBin
}

if (-not (Test-CommandExists "ruby")) {
    $rubyVersion = "3.3.8-1"
    $installerName = "rubyinstaller-devkit-$rubyVersion-x64.exe"
    $installerPath = Join-Path $env:TEMP $installerName
    $installerUrl = "https://github.com/oneclick/rubyinstaller2/releases/download/RubyInstaller-$rubyVersion/$installerName"

    Write-Host "Ruby not found. Downloading RubyInstaller from:"
    Write-Host "  $installerUrl"
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath

    Write-Host "Installing Ruby (current user, silent)..."
    Start-Process -FilePath $installerPath -ArgumentList "/verysilent", "/currentuser" -Wait

    $latestRubyBin = Get-LatestRubyBinPath
    if ($latestRubyBin) {
        Add-ToPathIfExists $latestRubyBin
    }
}

if (-not (Test-CommandExists "ruby")) {
    throw "Ruby is still unavailable after install. Open a new PowerShell and rerun this script."
}

Write-Host "Using Ruby: $(ruby -v)"

if ((-not $SkipRidkInstall) -and (Test-CommandExists "ridk")) {
    $ridkMarker = Join-Path $repoRoot ".ridk-install.done"
    if (-not (Test-Path $ridkMarker)) {
        Write-Host "Running MSYS2 toolchain install (ridk install 3)..."
        Write-Host "If prompted, choose default/recommended options."
        ridk install 3
        New-Item -ItemType File -Path $ridkMarker -Force | Out-Null
    }
}

if (-not (Test-CommandExists "bundle")) {
    Write-Host "Bundler missing. Installing bundler gem..."
    gem install bundler
}

Write-Host "Configuring local bundle path..."
bundle config set --local path vendor/bundle

Write-Host "Installing gems..."
bundle install

Write-Host "Starting Jekyll preview on http://127.0.0.1:$Port/"
bundle exec jekyll serve --livereload --host 127.0.0.1 --port $Port
