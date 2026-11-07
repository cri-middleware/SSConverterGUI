# ⚠️ Limitations & Scope

What this application does and does not do. Every official player publishes a page like this;
this is the converter's.

## What it is

SSConverter GUI is a **front end over the SDK's `ssconverter`** — the same conversion the players
run, the same one `ssconverter-cli` runs, with a window around it. It reads a SpriteStudio project
and writes the binaries a player loads. It does not play anything, and nothing it writes is
specific to this tool: the output of a conversion here, of `ssconverter-cli`, and of a player's own
importer are the same bytes.

That is the useful thing to know when something looks wrong: **if an animation converts here and
draws incorrectly in a player, the conversion is not where to look.** What each player can and
cannot draw is on that player's own Limitations page, and what none of them draw yet is on
[Shared Limitations](https://cri-middleware.github.io/SpriteStudio-Docs/sdk/limitations/).

## Input

| | |
|---|---|
| Project version | **SpriteStudio 7.6 or later** is supported. The `.ssab` / `.ssqb` formats are defined against it. |
| What is read | The `.sspj` and every file it references, from the `.ssae` and `.ssce` to the images and sounds. Point the app at the `.sspj`; the rest is found from it. The images and sounds have to sit in the `.sspj`'s folder or below it: one that is missing, outside that folder, or given as an absolute path fails that project, with the converter's reason in the result. |
| What is written | **`.ssab`** for animations, **`.ssqb`** for sequences. One `.sspj` yields one `.ssab` per animation pack. |

**Embedded Assets** bakes the images and sounds into the binary instead of leaving them beside it.
Embedded is one self-contained file; non-embedded keeps them replaceable and shared between packs.
Every player loads non-embedded, but not every player loads embedded — see
[Reference and embedded](https://cri-middleware.github.io/SpriteStudio-Docs/overview/conversion/#reference-and-embedded).

## Platforms

**macOS and Windows only.** There is no Linux build of this application. The conversion itself
runs anywhere the SDK does, so on Linux use
[`ssconverter-cli`](https://github.com/cri-middleware/SpriteStudio-SDK/tree/HEAD/cli), which is the same
conversion without a window.

The Windows executable is **unsigned**, so SmartScreen warns on first launch. See
[Installation](install.md) for what that looks like and how to proceed.

## Batch conversion stops at a budget

Dropping a folder in walks it for `.sspj` files, and that walk has a limit: **500,000 entries or 30
seconds**, whichever comes first. A folder large enough to hit it — a whole drive, a home
directory — is almost always a folder chosen too broadly.

The app does not fail silently when it happens. It converts what the walk already found and says
so, naming the limit and the count:

> Directory scan stopped at its limit (30 seconds) after 214908 entries; converting the 12 .sspj
> file(s) found so far. Choose a more specific folder to reach the rest.

**Treat that warning as a result, not a progress message** — the listing is incomplete, so a project
you expected may simply not have been reached. Choose a narrower folder and run it again.

There is no depth limit, so nesting alone never stops the walk.

The walk does pass over some folders without a message:

- a folder it cannot read, for want of permission, and everything inside it;
- a drive, share or disk image mounted somewhere inside the folder — the walk stays on the volume
  the folder is on, where `ssconverter-cli` goes on into it;
- a folder whose name begins with `.git`, as `ssconverter-cli` also skips;
- a symbolic link to a folder, which neither this walk nor `ssconverter-cli` follows.

A project missing from a batch that reported no warning is most likely under one of these.

## One failure does not stop the batch

Each `.sspj` is converted on its own. A project that fails is reported with its **full path** — in a
real batch nearly every project is called `project.sspj` — and the run continues to the next one.
The badge at the end then counts both, as in `3 ok / 1 failed`.

Cancelling is different: it stops the whole batch at the file in flight. The projects finished
before it keep their output, the badge says how far the run got, and if any converted, the run is
kept in the history. The file in flight may have written part of its output — the converter creates
its folder, writes the binaries and then copies the images and sounds, and a stop can land between any two —
so convert that project again before using what is in its folder.

Closing the window or quitting during a run ends it at once, which can also cut short a file being
written, even one left by an earlier conversion. Convert that project again in that case too.

## Not in scope

- **Playback and preview.** The app converts; it does not draw. To see an animation, use a player
  or the [browser demos](https://cri-middleware.github.io/SpriteStudio-Docs/overview/try-it/).
- **Editing.** Nothing here modifies a `.sspj`. That is SpriteStudio's job.
- **Reversing a conversion.** `.ssab` is a playback format; there is no path back to `.sspj`.
- **Watching a folder.** Conversion runs when you ask for it. A player that re-converts on save
  does that in its own editor integration — SpriteStudio Player for Godot's import dock,
  SpriteStudio Player for Unity's importer, SpriteStudio Player for Ren'Py's auto importer.
- **CI.** Use [`ssconverter-cli`](https://github.com/cri-middleware/SpriteStudio-SDK/tree/HEAD/cli) — a GUI in a
  pipeline is the wrong shape, and the two produce identical output.
