# Build the release: this machine's half of it -- the archives a consumer
# downloads -- then check what is there and write the checksum manifest over it.
#
#   .\scripts\build-release.ps1                             # build x86_64 and arm64, then check
#   .\scripts\build-release.ps1 arch=x86_64                 # one of them, while iterating
#   .\scripts\build-release.ps1 notices=no                  # quicker, but not what ships
#   .\scripts\build-release.ps1 build=no in=release-dist    # check the matrix's three archives
#
# The Windows twin of scripts/build-release.sh, and the same shape: release.yml
# runs the .ps1 for the Windows matrix entries and the .sh for macOS and for the
# package job, so CI and a local run cannot drift. The workflow keeps only what
# is GitHub's -- the checkout, the toolchain, the artifact download, the
# artifact upload and the Release itself.
#
# The build is delegated, not reimplemented: scripts/release-windows.ps1 builds
# and archives one arch (arm64 cross-compiles from an x86_64 host, as CI does),
# and this runs it once per arch and checks what came out.
#
# There is no sign= here. The Windows executable is deliberately not
# code-signed -- see docs/en/install.md -- so signing is the macOS half's, and
# lives in build-release.sh.
#
# One machine cannot produce a whole release -- the universal .app needs macOS
# -- so a build run requires only what it built. Requiring all three archives is
# what build=no means: the phase after the matrix, where every archive has
# arrived and a missing one is a Release with no download for that platform.
# Nobody notices that until somebody on that platform tries.
#
# This is also the phase AFTER it has been decided what is being released: the
# tag comes from the checkout, not from an option, and it must match
# package.json.
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $Arguments
)

$ErrorActionPreference = "Stop"

$app = Split-Path -Leaf $PSCommandPath
$rootDirectory = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

# The archives a release is made of: one per matrix entry, named by the arch the
# entry builds. Adding a matrix entry means adding it here, which is deliberate
# -- the list is what makes a missing platform an error rather than a smaller
# release.
$expected = @(
    @{ arch = "universal"; ext = "tar.gz" },
    @{ arch = "x86_64";    ext = "zip" },
    @{ arch = "arm64";     ext = "zip" }
)

# What a build run on this machine can produce. The universal .tar.gz is
# build-release.sh's, on macOS.
$buildable = @("x86_64", "arm64")

# --- options ---------------------------------------------------------------

$build = "yes"
$arch = "all"
$in = "dist-release"
$inGiven = $false
$notices = "yes"
$verify = "yes"

function Show-Usage {
    Write-Host "Usage: $app [options]"
    Write-Host "$app options:"
    Write-Host "  build=<yes|no>          Build this machine's archives before checking (default:"
    Write-Host "                          yes) -- scripts/release-windows.ps1, once per arch. no is"
    Write-Host "                          the phase after the build matrix: check the archives that"
    Write-Host "                          are already in <in> and write SHA256SUMS over them."
    Write-Host "  arch=<x86_64|arm64|all> Which Windows archives to build (default: all). arm64"
    Write-Host "                          cross-compiles from an x86_64 host and needs the"
    Write-Host "                          'MSVC v143 - VS 2022 C++ ARM64 build tools' component."
    Write-Host "                          Ignored with build=no."
    Write-Host "  in=<dir>                Where the archives are (default: dist-release, which is"
    Write-Host "                          where release-windows.ps1 writes -- so build=yes cannot"
    Write-Host "                          be pointed elsewhere). With build=no this is what to"
    Write-Host "                          check: the workflow downloads every build artifact into"
    Write-Host "                          release-dist with merge-multiple, so they land side by"
    Write-Host "                          side."
    Write-Host "  notices=<yes|no>        Generate THIRD_PARTY_NOTICES.md into the archive"
    Write-Host "                          (default: yes, and it needs cargo-about). no is quicker,"
    Write-Host "                          and the archive then differs from the released one."
    Write-Host "  verify=<yes|no>         Check the archives before writing SHA256SUMS (default:"
    Write-Host "                          yes). no writes the manifest over whatever is there,"
    Write-Host "                          which is not a thing to ship."
        Write-Host "  out= clean= sdk= skip=  Accepted and ignored here. The family's build-release"
    Write-Host "                          scripts share out= clean= verify= in= sdk= skip=,"
    Write-Host "                          so one command line drives all of them."
Write-Host "  -h | --help             Show this help"
    Write-Host ""
    Write-Host "Output: the archive(s) in <in>, and SHA256SUMS beside them -- the set release.yml"
    Write-Host "attaches to the draft Release."
    Write-Host ""
    Write-Host "There is no option for which release this is: the tag comes from the checkout"
    Write-Host "this runs in (the ref the workflow was dispatched from, or 'git checkout <tag>'"
    Write-Host "locally), and it must match package.json's version."
}

foreach ($argument in $Arguments) {
    switch -Regex ($argument) {
        '^(-h|--help|help)$' { Show-Usage; exit 0 }
        '^build='   { $build = $argument.Substring(6).ToLower() }
        '^arch='    { $arch = $argument.Substring(5).ToLower() }
        '^in='      { $in = $argument.Substring(3); $inGiven = $true }
        '^notices=' { $notices = $argument.Substring(8).ToLower() }
        '^verify='  { $verify = $argument.Substring(7).ToLower() }
        # Named rather than lumped in with the unknown options: it is the one
        # option the .sh twin has and this does not, and the reason is worth a
        # line rather than a shrug.
        '^sign=' {
            Write-Error "${app}: there is no sign= here -- the Windows executable is not code-signed. macOS signing is scripts/build-release.sh's."
        }
        # Accepted so one command line drives build-release in every repository
        # of the family; this one has no use for them.
        '^(out|clean|sdk|skip)=' {
            [Console]::Error.WriteLine("${app}: " + ($argument -replace '=.*$', '') + "= does not apply here; ignored")
        }
        default {
            # Plain stderr and the code, matching the .sh twin (2 = bad usage).
            # Write-Error throws under $ErrorActionPreference = "Stop", so an
            # `exit 2` after one never runs and the shell sees 1.
            [Console]::Error.WriteLine("${app}: unknown argument '$argument' (options are key=value; see $app --help)")
            exit 2
        }
    }
}

if ($build   -notin @("yes", "no"))                { Write-Error "${app}: build must be yes or no (got '$build')" }
if ($arch    -notin @("x86_64", "arm64", "all"))   { Write-Error "${app}: arch must be x86_64, arm64 or all (got '$arch')" }
if ($notices -notin @("yes", "no"))                { Write-Error "${app}: notices must be yes or no (got '$notices')" }
if ($verify  -notin @("yes", "no"))                { Write-Error "${app}: verify must be yes or no (got '$verify')" }

# A path that was given is relative to where it was typed; the default is
# relative to the repo, so it means the same directory from anywhere.
# GetFullPath(path, basePath) rather than Join-Path: Join-Path concatenates
# unconditionally, so an in= that is already absolute would be appended to the
# current directory instead of used as given.
if ($inGiven) {
    $in = [System.IO.Path]::GetFullPath($in, (Get-Location).Path)
} else {
    $in = [System.IO.Path]::GetFullPath($in, $rootDirectory)
}

Set-Location $rootDirectory

# release-windows.ps1 writes into dist-release and offers no say in it, so a
# build run cannot be pointed somewhere else: it would build one place and check
# another, and report an empty directory as a platform that produced nothing.
if (($build -eq "yes") -and ($in -ne [System.IO.Path]::GetFullPath("dist-release", $rootDirectory))) {
    Write-Error "${app}: in=$in with build=yes -- release-windows.ps1 writes into $rootDirectory\dist-release. Drop in= to build there, or pass build=no to check archives somewhere else."
}

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
Write-Host "  build    => $build"
Write-Host "  in       => $in"
if ($build -eq "yes") {
    Write-Host "  arch     => $arch"
    Write-Host "  notices  => $notices"
}
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

# --- helpers ---------------------------------------------------------------

function Write-Step($message) {
    Write-Host ""
    Write-Host ">> $message"
}

$failed = New-Object System.Collections.Generic.List[string]

$names = foreach ($spec in $expected) { "SSConverterGUI_${version}_$($spec.arch).$($spec.ext)" }

# Anything named like a release archive but not one of this release's is either
# a stale build from an earlier version or a name nobody expects -- both end up
# attached to the Release by the *.zip / *.tar.gz globs, so say so rather than
# ship it.
function Find-UnknownArchives {
    foreach ($file in Get-ChildItem -Path $in -Include *.zip, *.tar.gz -File -Recurse -Depth 0) {
        if ($names -notcontains $file.Name) {
            $failed.Add("$($file.Name) is in $in but is not one of this release's archives")
        }
    }
}

# --- build -----------------------------------------------------------------
# $IsWindows only exists in PowerShell 6+; Windows PowerShell 5.1 runs nowhere
# else, so its absence is the answer.
$onWindows = if ($null -ne $IsWindows) { $IsWindows } else { $true }

if ($build -eq "yes") {
    if (-not $onWindows) {
        Write-Error "${app}: build=yes builds the Windows half of the release, and that needs Windows. On macOS run scripts/build-release.sh; anywhere else, build=no checks archives that are already here."
    }

    if ($arch -eq "all") { $building = $buildable } else { $building = @($arch) }

    # Before the build, not after it: a stale archive from an earlier version is
    # a one-line fix, and finding it at the end means finding it two Tauri
    # builds later.
    if (($verify -eq "yes") -and (Test-Path -PathType Container $in)) {
        Find-UnknownArchives
        if ($failed.Count -gt 0) {
            Write-Host ""
            Write-Error "${app}: $in holds archives that are not this release's:`n  $($failed -join "`n  ")`nRemove them first -- they would be attached to the Release alongside the current ones."
        }
    }

    foreach ($target in $building) {
        Write-Step "building SSConverterGUI $version -- Windows $target"
        if ($notices -eq "no") {
            & "$rootDirectory/scripts/release-windows.ps1" -Arch $target -SkipNotices
        } else {
            & "$rootDirectory/scripts/release-windows.ps1" -Arch $target
        }
    }
}

# --- preflight -------------------------------------------------------------

if (-not (Test-Path -PathType Container $in)) {
    Write-Error "${app}: $in does not exist. Populate it first -- 'gh run download <run-id> -D release-dist' -- or build it (drop build=no), or point in= at the archives"
}

# Get-FileHash returns an upper-case hash; sha256sum writes lower-case. Emit the
# lower-case form so SHA256SUMS is byte-identical to the one the shell twin (and
# CI) writes, and so `sha256sum -c` accepts it.
function Get-Sha256($file) { (Get-FileHash -Algorithm SHA256 -Path $file).Hash.ToLower() }

# What has to be here. A build run produced this platform's archives and cannot
# have produced the others, so only those are required; collecting is the phase
# where the whole release has arrived, and every archive is.
if ($build -eq "yes") {
    $required = foreach ($target in $building) { "SSConverterGUI_${version}_$target.zip" }
} else {
    $required = $names
}

# --- check the archives ----------------------------------------------------
if ($verify -eq "yes") {
    Write-Step "checking $in"

    $failed.Clear()

    foreach ($name in $required) {
        $path = Join-Path $in $name
        if (-not (Test-Path $path)) {
            if ($build -eq "yes") {
                $failed.Add("$name is missing (the build produced nothing, or named it differently)")
            } else {
                $failed.Add("$name is missing (its matrix entry produced nothing, or named it differently)")
            }
        } elseif ((Get-Item $path).Length -eq 0) {
            $failed.Add("$name is empty")
        } else {
            Write-Host ("   $name  ({0} MB)" -f [int]((Get-Item $path).Length / 1MB))
        }
    }

    Find-UnknownArchives

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
if ($build -eq "yes") {
    Write-Host "${app}: this machine's half of the release. The macOS archive comes from"
    Write-Host "${app}: scripts/build-release.sh on macOS; build=no checks the three together."
} else {
    Write-Host "${app}: this is what release.yml attaches to the draft Release."
}
