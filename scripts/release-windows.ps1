#!/usr/bin/env pwsh
# Builds a Windows release archive the way .github/workflows/release.yml does,
# so a release build can be verified locally before one is dispatched.
#
# Output: dist-release\SSConverterGUI_<version>_<arch>.zip
#
# arm64 cross-compiles from an x64 host — what CI does, and the same approach as
# the SDK's scripts/release-windows-arm64.ps1. It needs the "MSVC v143 - VS 2022
# C++ ARM64 build tools" component from the Visual Studio Installer; the Rust
# target is added below.
#
# Usage:
#   ./scripts/release-windows.ps1                # x64 (host build)
#   ./scripts/release-windows.ps1 -Arch arm64    # arm64 (cross-compiled)
#   ./scripts/release-windows.ps1 -SkipNotices   # skip THIRD_PARTY_NOTICES.md

[CmdletBinding()]
param(
    [ValidateSet('x64', 'arm64')]
    [string]$Arch = 'x64',
    # Quicker, but the archive then differs from the released one.
    [switch]$SkipNotices
)

$ErrorActionPreference = 'Stop'

# A failing native command sets $LASTEXITCODE but does not stop the script on
# every PowerShell version, which would leave a stale exe to be zipped up as if
# the build had succeeded.
function Invoke-Checked {
    param(
        [Parameter(Mandatory)][string]$Command,
        [Parameter(ValueFromRemainingArguments)][string[]]$Arguments
    )
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
    $version = Invoke-Checked node -p "require('./package.json').version"
    $outDir = 'dist-release'
    $staging = Join-Path $outDir 'SSConverterGUI'

    Write-Host "==> SSConverterGUI $version - Windows $Arch"

    # `--no-bundle` keeps this to a portable exe, so no installer generator has
    # to understand the target architecture.
    $buildArgs = @('tauri', 'build', '--no-bundle')
    $releaseDir = 'src-tauri/target/release'
    if ($Arch -eq 'arm64') {
        $triple = 'aarch64-pc-windows-msvc'
        Invoke-Checked rustup target add $triple
        $buildArgs += @('--target', $triple)
        # A --target build lands under target/<triple>/release.
        $releaseDir = "src-tauri/target/$triple/release"
    }

    Invoke-Checked pnpm install --frozen-lockfile
    Invoke-Checked pnpm exec @buildArgs

    $exe = Get-ChildItem "$releaseDir/*.exe" | Select-Object -First 1
    if (-not $exe) { throw "no .exe found in $releaseDir" }

    # A leftover staging directory from an earlier run must not leak into the zip.
    if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $staging | Out-Null

    Copy-Item $exe.FullName -Destination (Join-Path $staging 'SSConverterGUI.exe')
    Copy-Item 'LICENSE.md' -Destination (Join-Path $staging 'LICENSE.md')

    if ($SkipNotices) {
        Write-Host '==> Skipping third-party license notices (-SkipNotices)'
    } else {
        Write-Host '==> Generating third-party license notices'
        if (-not (Get-Command cargo-about -ErrorAction SilentlyContinue)) {
            throw 'cargo-about is required: cargo install cargo-about (or re-run with -SkipNotices)'
        }
        $notices = Join-Path $staging 'THIRD_PARTY_NOTICES.md'
        Invoke-Checked cargo about generate -c about.toml about.hbs `
            --manifest-path src-tauri/Cargo.toml -o $notices
        Invoke-Checked node scripts/gen-npm-notices.mjs $notices
    }

    $zip = Join-Path $outDir "SSConverterGUI_${version}_${Arch}.zip"
    if (Test-Path $zip) { Remove-Item $zip -Force }
    Compress-Archive -Path "$staging/*" -DestinationPath $zip

    Write-Host "==> $zip"
    Get-FileHash $zip -Algorithm SHA256 | Format-List Algorithm, Hash, Path
} finally {
    Pop-Location
}
