# 📥 Installation

This page is for users who want to run the finished application. It requires no command-line
knowledge. If you want to build from source instead, see [Development](development.md).

## System requirements

| OS | Requirement |
|---|---|
| **macOS** | macOS 10.15 (Catalina) or later. Apple Silicon and Intel are both covered by the same universal build. |
| **Windows** | Windows 10 or 11 (64-bit) with the [WebView2 runtime](https://developer.microsoft.com/microsoft-edge/webview2/), which is preinstalled on current Windows 10 and 11. x86_64 and Arm-based PCs each have their own build. |

Every build is portable: there is no installer, and the application itself stays in the folder you
unpack it into. The only thing written elsewhere is its per-user data — the theme choice and the
conversion history — in the folder listed under Uninstalling below.

## Download

Open the [GitHub Releases](https://github.com/cri-middleware/SSConverterGUI/releases) page and
download the archive for your OS from the latest release.

| OS | File |
|---|---|
| macOS (Apple Silicon / Intel) | `SSConverterGUI_<version>_universal.tar.gz` |
| Windows (x86_64) | `SSConverterGUI_<version>_x86_64.zip` |
| Windows on Arm | `SSConverterGUI_<version>_arm64.zip` |

Each archive also contains `LICENSE.md`, `LICENSE.ja.md` and `THIRD_PARTY_NOTICES.md`.

!!! tip "Which Windows archive do I need?"

    Open **Settings → System → About** and look at **System type**. If it says *ARM-based
    processor*, take the `arm64` archive; otherwise take `x86_64`. On Windows 11 an Arm PC can also
    run the x86_64 build through emulation, but the arm64 build runs natively, without that cost.

### Verifying your download (optional)

Every release ships a `SHA256SUMS` file listing the checksum of each archive. Download it into the
same folder as the archive to confirm the file arrived intact.

On macOS (it prints the archive's name followed by `OK`):

```bash
grep universal SHA256SUMS | shasum -a 256 -c
```

On Windows (PowerShell) — compare the printed hash against the matching line in `SHA256SUMS`
(PowerShell prints it in upper case, `SHA256SUMS` in lower case):

```powershell
Get-FileHash .\SSConverterGUI_<version>_<arch>.zip -Algorithm SHA256
```

## Running the application

### macOS

1. Double-click the `.tar.gz` to unpack it into a folder.
2. Move `SSConverterGUI.app` out of that folder into your **Applications** folder.
3. Double-click it to launch.

The application is code-signed with a CRI Middleware Developer ID certificate and notarized by
Apple, so it opens normally.

!!! warning "If macOS reports the app as damaged or from an unidentified developer"

    The file may have been altered in transit, or may not be an official build. Delete it, download the
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
components. Its theme choice and conversion history stay in a per-user folder; delete that too to
remove them:

- macOS: `~/Library/WebKit/jp.co.cri-mw.spritestudio.ssconvertergui`
- Windows: `%LOCALAPPDATA%\jp.co.cri-mw.spritestudio.ssconvertergui`

Paste the path into Finder's **Go → Go to Folder…** or into File Explorer's address bar to open it.
