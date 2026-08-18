# Collect the release: check the per-platform archives the build matrix
# produced, and write the checksum manifest over them.
#
#   .\scripts\build-release.ps1                  # collect from release-dist\
#   .\scripts\build-release.ps1 in=C:\tmp\dl
#
# release.yml's package job runs the .sh twin for the assets it uploads, so CI
# and a local run cannot drift. The workflow keeps only what is GitHub's -- the
# artifact download, the artifact upload and the Release itself.
#
# There is less to do here than in the sibling repos, and that is the point:
# scripts/release-macos.sh and scripts/release-windows.ps1 already build, sign,
# notarize and archive their own platform, each writing a finished
# dist-release/SSConverterGUI_<version>_<arch>.<ext>. Nothing needs to be laid
# out afterwards. What was left in the workflow was two lines of sha256sum and
# no check at all -- so what this adds is the check.
#
# Which matters because the archives arrive from three separate jobs on two
# operating systems, and the failure this catches is a quiet one: a matrix entry
# that built nothing, or built something named after the wrong version, leaves a
# Release that simply has no download for that platform. Nobody notices until
# somebody on that platform tries.
#
# This is the phase AFTER it has been decided what is being released: the tag
# comes from the checkout, not from an option, and it must match package.json.
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $Arguments
)

$ErrorActionPreference = "Stop"

$app = Split-Path -Leaf $PSCommandPath
$rootDirectory = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

# The archives the matrix produces: one per entry, named by the arch the entry
# builds. Adding a matrix entry means adding it here, which is deliberate -- the
# list is what makes a missing platform an error rather than a smaller release.
$expected = @(
    @{ arch = "universal"; ext = "tar.gz" },
    @{ arch = "x86_64";    ext = "zip" },
    @{ arch = "arm64";     ext = "zip" }
)

# --- options ---------------------------------------------------------------

$in = "release-dist"
$verify = "yes"

function Show-Usage {
    Write-Host "Usage: $app [options]"
    Write-Host "$app options:"
    Write-Host "  in=<dir>                Where the per-platform archives are (default:"
    Write-Host "                          release-dist). The workflow downloads every build"
    Write-Host "                          artifact into it with merge-multiple, so they all land"
    Write-Host "                          side by side; locally that is what release-macos.sh and"
    Write-Host "                          release-windows.ps1 write into dist-release."
    Write-Host "  verify=<yes|no>         Check the archives before writing SHA256SUMS (default:"
    Write-Host "                          yes). no writes the manifest over whatever is there,"
    Write-Host "                          which is not a thing to ship."
    Write-Host "  -h | --help             Show this help"
    Write-Host ""
    Write-Host "Output: SHA256SUMS in <in>, beside the archives it covers -- the set release.yml"
    Write-Host "attaches to the draft Release."
    Write-Host ""
    Write-Host "There is no option for which release this is: the tag comes from the checkout"
    Write-Host "this runs in (the ref the workflow was dispatched from, or 'git checkout <tag>'"
    Write-Host "locally), and it must match package.json's version."
}

foreach ($argument in $Arguments) {
    switch -Regex ($argument) {
        '^(-h|--help|help)$' { Show-Usage; exit 0 }
        '^in='     { $in = $argument.Substring(3) }
        '^verify=' { $verify = $argument.Substring(7).ToLower() }
        default {
            Write-Error "${app}: unknown argument '$argument' (options are key=value; see $app --help)"
        }
    }
}

if ($verify -notin @("yes", "no")) { Write-Error "${app}: verify must be yes or no (got '$verify')" }

# GetFullPath(path, basePath) rather than Join-Path: Join-Path concatenates
# unconditionally, so an in= that is already absolute would be appended to the
# current directory instead of used as given.
$in = [System.IO.Path]::GetFullPath($in, (Get-Location).Path)

Set-Location $rootDirectory

# --- what this release is called -------------------------------------------
$version = (& "$rootDirectory/scripts/release-version.ps1").Trim()
$manifestTag = "v$version"

if (($env:GITHUB_REF_TYPE -eq "tag") -and $env:GITHUB_REF_NAME) {
    $tag = $env:GITHUB_REF_NAME
    $tagSource = "GITHUB_REF_NAME -- the ref this release was dispatched from"
} else {
    $described = & git -C $rootDirectory describe --exact-match --match 'v[0-9]*' --tags HEAD 2>$null
    if ($LASTEXITCODE -eq 0 -and $described) {
        $tag = $described.Trim()
        $tagSource = "the release tag HEAD is checked out at"
    } else {
        $tag = ""
        $tagSource = "HEAD is not on a release tag, so this is a build, not a release"
    }
}

Write-Host "options"
Write-Host "  in       => $in"
Write-Host "  verify   => $verify"
Write-Host "  version  => $version"
if ($tag) { Write-Host "  tag      => $tag" } else { Write-Host "  tag      => (none)" }
Write-Host "              ($tagSource)"

# A tag that disagrees with package.json is not a warning: every archive is
# named after package.json's version, so the Release would be called one thing
# and carry files called another.
if ($tag -and ($tag -ne $manifestTag)) {
    Write-Host ""
    Write-Error "${app}: tag $tag does not match package.json ($manifestTag). Bump the version (and src-tauri/Cargo.toml with it), or retag -- the archives are named SSConverterGUI_${version}_*."
}

# --- preflight -------------------------------------------------------------

if (-not (Test-Path -PathType Container $in)) {
    Write-Error "${app}: $in does not exist. Populate it first -- 'gh run download <run-id> -D release-dist' -- or point in= at the archives (locally, dist-release)"
}

# Get-FileHash returns an upper-case hash; sha256sum writes lower-case. Emit the
# lower-case form so SHA256SUMS is byte-identical to the one the shell twin (and
# CI) writes, and so `sha256sum -c` accepts it.
function Get-Sha256($file) { (Get-FileHash -Algorithm SHA256 -Path $file).Hash.ToLower() }

function Write-Step($message) {
    Write-Host ""
    Write-Host ">> $message"
}

$failed = New-Object System.Collections.Generic.List[string]

# --- check the archives ----------------------------------------------------
$names = foreach ($spec in $expected) { "SSConverterGUI_${version}_$($spec.arch).$($spec.ext)" }

if ($verify -eq "yes") {
    Write-Step "checking $in"

    foreach ($name in $names) {
        $path = Join-Path $in $name
        if (-not (Test-Path $path)) {
            $failed.Add("$name is missing (its matrix entry produced nothing, or named it differently)")
        } elseif ((Get-Item $path).Length -eq 0) {
            $failed.Add("$name is empty")
        } else {
            Write-Host ("   $name  ({0} MB)" -f [int]((Get-Item $path).Length / 1MB))
        }
    }

    # Anything else named like a release archive is either a stale build from an
    # earlier version or a name nobody expects -- both end up attached to the
    # Release by the *.zip / *.tar.gz globs, so say so rather than ship it.
    foreach ($file in Get-ChildItem -Path $in -Include *.zip, *.tar.gz -File -Recurse -Depth 0) {
        if ($names -notcontains $file.Name) {
            $failed.Add("$($file.Name) is in $in but is not one of this release's archives")
        }
    }

    if ($failed.Count -gt 0) {
        Write-Host ""
        Write-Error "${app}: the release in $in is not shippable:`n  $($failed -join "`n  ")"
    }
} else {
    Write-Step "verify=no -- the archives are not checked"
}

# --- checksums -------------------------------------------------------------
# Canonical manifest so a consumer can verify each downloaded file's integrity
# (`sha256sum -c SHA256SUMS --ignore-missing` for a partial download). Two
# spaces, LF, no BOM: that is the format, on every platform.
Write-Step "writing SHA256SUMS"
$archives = Get-ChildItem -Path $in -Include *.tar.gz, *.zip -File -Recurse -Depth 0 | Sort-Object Name
$sumLines = foreach ($file in $archives) { "$(Get-Sha256 $file.FullName)  $($file.Name)" }
[System.IO.File]::WriteAllText("$in/SHA256SUMS", ($sumLines -join "`n") + "`n", (New-Object System.Text.UTF8Encoding $false))
foreach ($line in $sumLines) { Write-Host "   $line" }

if ($verify -eq "yes") {
    foreach ($line in Get-Content "$in/SHA256SUMS") {
        $parts = $line -split '\s+', 2
        if ($parts.Count -ne 2) { continue }
        if ((Get-Sha256 (Join-Path $in $parts[1].Trim())) -ne $parts[0].ToLower()) {
            Write-Error "${app}: SHA256SUMS does not verify against the files it was just written from"
        }
    }
    Write-Host ""
    Write-Host "   all checks passed"
}

# --- done ------------------------------------------------------------------
Write-Host ""
if ($tag) {
    Write-Host "${app}: done -> $in  ($tag)"
} else {
    Write-Host "${app}: done -> $in  ($manifestTag)"
}
Write-Host ""
Write-Host "${app}: this is what release.yml attaches to the draft Release."
