# Print the app version -- what a release should be tagged as, and what every
# release archive is named after.
#
#   .\scripts\release-version.ps1            # 7.0.0-beta.1
#   "v$(.\scripts\release-version.ps1)"      # v7.0.0-beta.1  -- the git tag
#
# It is `version` in package.json, which is the single source: tauri.conf.json
# reads it ("version": "../package.json"), the get_versions command surfaces it
# at runtime, and release-macos.sh / release-windows.ps1 name their archives
# after it. src-tauri/Cargo.toml carries a copy that has to be bumped with it.
#
# The tag is what names a release. This is what the tag *must* be: build-release
# refuses a tag that disagrees, because a Release called v1.2.3 carrying
# SSConverterGUI_1.2.4_universal.tar.gz is worse than no release at all.
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $Arguments
)

$ErrorActionPreference = "Stop"

$app = Split-Path -Leaf $PSCommandPath
foreach ($argument in $Arguments) {
    switch -Regex ($argument) {
        '^(-h|--help|help)$' {
            Write-Host "Usage: $app"
            Write-Host "Prints ""version"" from package.json (no leading 'v')."
            exit 0
        }
        default { Write-Error "${app}: unexpected argument '$argument' (see $app --help)" }
    }
}

$rootDirectory = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$manifest = "$rootDirectory/package.json"

if (-not (Test-Path $manifest)) {
    Write-Error "${app}: $manifest not found -- is this the SSConverterGUI repo?"
}

# ConvertFrom-Json rather than node: PowerShell parses JSON natively, so this
# twin has one fewer prerequisite than the shell one (which asks node, because
# node builds the app there anyway).
$version = (Get-Content -Raw $manifest | ConvertFrom-Json).version

if (-not $version) { Write-Error "${app}: package.json has no ""version""" }

Write-Output $version
