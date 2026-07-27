# Installation

This page is for users who want to run the finished application. It requires no command-line
knowledge. If you want to build from source instead, see [Development](development.md).

## System requirements

| OS | Requirement |
|---|---|
| **macOS** | macOS 10.15 (Catalina) or later. Apple silicon and Intel are both covered by the same universal build. |
| **Windows** | Windows 10 or 11 (64-bit) with the [WebView2 runtime](https://developer.microsoft.com/microsoft-edge/webview2/), which is preinstalled on current Windows 10 and 11. |

Both builds are portable: there is no installer, and nothing is written outside the folder you
unpack them into.

## Download

Open the [GitHub Releases](https://github.com/cri-middleware/SSConverterGUI/releases) page and
download the archive for your OS from the latest release.

| OS | File |
|---|---|
| macOS | `SSConverterGUI_<version>_universal.app.tar.gz` |
| Windows | `SSConverterGUI_<version>_x64.zip` |

Each archive also contains `LICENSE.md` and `THIRD_PARTY_NOTICES.md`.

### Verifying your download (optional)

Every release ships a `SHA256SUMS` file listing the checksum of each archive. Download it into the
same folder as the archive to confirm the file arrived intact.

On macOS:

```bash
shasum -a 256 -c SHA256SUMS --ignore-missing
```

On Windows (PowerShell) — compare the printed hash against the matching line in `SHA256SUMS`:

```powershell
Get-FileHash .\SSConverterGUI_<version>_x64.zip -Algorithm SHA256
```

## Running the application

### macOS

1. Double-click the `.app.tar.gz` to unpack it.
2. Move `SSConverterGUI.app` into your **Applications** folder.
3. Double-click it to launch.

The application is code-signed with a CRI Middleware Developer ID certificate and notarized by
Apple, so it opens normally. You do **not** need to right-click → Open, or clear the quarantine
attribute by hand.

!!! warning "If macOS reports the app as damaged or from an unidentified developer"

    That means the file was altered in transit or is not an official build. Delete it, download the
    archive again from the
    [Releases](https://github.com/cri-middleware/SSConverterGUI/releases) page, and verify it
    against `SHA256SUMS` as shown above.

### Windows

1. Right-click the `.zip`, choose **Extract All**, and unpack it wherever you like.
2. Run `SSConverterGUI.exe`.

!!! warning "SmartScreen warning on first launch"

    The Windows executable is **not** code-signed, so Windows shows a blue
    **"Windows protected your PC"** dialog the first time you run it. This is expected: it reflects
    the absence of a signature, not a problem detected in the application.

    To continue, click **More info**, then **Run anyway**. If you would rather confirm the file
    first, verify it against `SHA256SUMS` as shown above.

Once the application starts, continue to [Usage](usage.md).

## Uninstalling

Delete the unpacked folder, or `SSConverterGUI.app`. The application installs no system-wide
components; only its window settings and conversion history remain, in the standard per-user
application data folder.
