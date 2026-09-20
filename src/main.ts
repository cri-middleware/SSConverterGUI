import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { listen } from '@tauri-apps/api/event';
import { dirname, basename, join } from '@tauri-apps/api/path';
import { updateHistory, sanitizeHistory, defaultOutputName, historySummary, HistoryItem } from './utils';
import './style.css';

// Mirrors the Rust `ConvertSummary` returned by the `convert_sspj` command.
interface ConvertSummary {
    succeeded: string[];
    failed: { path: string; error: string }[];
    // Every distinct directory the converter reported writing to, in order.
    output_dirs: string[];
    // Already logged live via the `convert-warning` event; used here only to
    // decide the final status.
    warnings: string[];
}

// Mirrors the Rust `path_kind` command: the real filesystem type of a path,
// with `.sspj` recognised exactly as the converter recognises it.
type PathKind = 'sspj' | 'file' | 'dir' | 'missing';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <button id="themeToggle" class="theme-toggle" aria-label="Toggle Theme" title="Toggle Theme">☀️</button>
  <div class="header">
    <h1>SSConverter GUI</h1>
    <p>Convert SpriteStudio projects (.sspj) to binaries (.ssab)</p>
  </div>
  
  <div class="panel">
    <div class="form-group drop-zone" id="dropZoneIn">
      <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <span style="font-size: 1.1rem; color: #818cf8;">📥 Target .sspj File or Folder</span>
      </label>
      <div class="input-row" style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
        <input type="text" id="inDirDisplay" readonly placeholder="Select or drop a SpriteStudio Project / Folder..." style="flex: 1;">
        <button class="btn" id="btnSelectInFile">File...</button>
        <button class="btn" id="btnSelectInDir">Folder...</button>
      </div>
    </div>

    <div class="form-group drop-zone" id="dropZoneOut" style="margin-top: 0.5rem;">
      <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <span style="font-size: 1.1rem; color: #818cf8;">📤 Output Directory</span>
        <button class="btn" id="btnClearOut" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; background: rgba(239, 68, 68, 0.2); color: #f87171;">Clear</button>
      </label>
      <div class="input-row" style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
        <input type="text" id="outDirDisplay" readonly placeholder="Leave empty to output next to .sspj" style="flex: 1;">
        <button class="btn" id="btnSelectOut">Browse...</button>
      </div>
      <small style="color: var(--text-muted); display: block; margin-top: 0.25rem;">Note: Ignored during Folder batch conversion.</small>
    </div>

    <div class="options-group">
      <label class="checkbox-label">
        <input type="checkbox" id="chkEmbedded">
        Embedded Assets
      </label>
    </div>

    <div class="action-row">
      <button class="btn btn-success btn-full" id="btnConvert" disabled>
        ⚡ Convert
      </button>
      <span class="status-badge badge-pending" id="convertStatus">Waiting</span>
      <button class="btn btn-secondary" id="btnRevealOutput" style="display: none;" title="Show the output in the file manager">📂 Reveal Output</button>
    </div>
    
    <div style="display: flex; gap: 1.5rem; margin-top: 1.25rem; flex: 1 1 0; min-height: 160px;">
      <!-- History Area -->
      <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="color: var(--text-muted); font-weight: 600;">History</span>
          <button class="btn" id="btnClearHistory" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; background: rgba(239, 68, 68, 0.2); color: #f87171;">Clear History</button>
        </div>
        <div id="historyArea" style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; padding-right: 0.5rem; min-height: 0;"></div>
      </div>

      <!-- Logs Area -->
      <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="color: var(--text-muted); font-weight: 600;">Logs</span>
          <button class="btn" id="btnClearLog" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; background: rgba(239, 68, 68, 0.2); color: #f87171;">Clear Logs</button>
        </div>
        <div class="log-area" id="logArea" style="flex: 1; margin-top: 0; max-height: none; min-height: 0;"></div>
      </div>
    </div>
  </div>

  <div style="text-align: center; margin-top: 1rem; color: var(--text-muted); font-size: 0.85rem; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
    <span id="appVersionDisplay">App Version: Loading...</span>
    <span id="versionDisplay">Converter Version: Loading...</span>
    <button class="btn btn-secondary" id="btnCopyVersion" style="margin-top: 0.25rem; padding: 0.1rem 0.4rem; font-size: 0.75rem; display: none;" title="Copy Versions">Copy Versions</button>
  </div>

  <!-- Progress Modal -->
  <div id="progressModal" style="display: none; position: fixed; inset: 0; background: var(--modal-overlay); z-index: 1000; justify-content: center; align-items: center; backdrop-filter: blur(2px);">
    <div style="background: var(--bg-panel); padding: 1.5rem; border-radius: 12px; width: 90%; max-width: 600px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); border: 1px solid var(--border-color);">
      <h3 style="margin-top: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;" id="modalTitle">
        <div class="spinner" id="modalSpinner"></div>
        <span id="modalTitleText">Processing...</span>
      </h3>
      <div id="modalProgress" style="display: none; margin-top: 0.75rem;">
        <div class="progress-track"><div class="progress-fill" id="modalProgressFill"></div></div>
        <div id="modalProgressText" style="margin-top: 0.35rem; font-size: 0.8rem; color: var(--text-muted); text-align: right;"></div>
      </div>
      <div id="modalLogArea" style="background: var(--bg-surface); padding: 0.75rem; border-radius: 8px; height: 180px; overflow-y: auto; font-family: monospace; font-size: 0.8rem; margin: 1rem 0; color: var(--text-muted); border: 1px solid var(--border-color); white-space: pre-wrap;"></div>
      <div style="display: flex; justify-content: flex-end;">
        <button class="btn" id="btnCancelConvert" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4);">Stop / Cancel</button>
      </div>
    </div>
  </div>
`;

const btnSelectInFile = document.getElementById('btnSelectInFile') as HTMLButtonElement;
const btnSelectInDir = document.getElementById('btnSelectInDir') as HTMLButtonElement;
const btnSelectOut = document.getElementById('btnSelectOut') as HTMLButtonElement;
const btnClearOut = document.getElementById('btnClearOut') as HTMLButtonElement;
const btnConvert = document.getElementById('btnConvert') as HTMLButtonElement;
const btnClearLog = document.getElementById('btnClearLog') as HTMLButtonElement;
const btnClearHistory = document.getElementById('btnClearHistory') as HTMLButtonElement;
const dropZoneIn = document.getElementById('dropZoneIn')!;
const dropZoneOut = document.getElementById('dropZoneOut')!;
const inDirDisplay = document.getElementById('inDirDisplay') as HTMLInputElement;
const outDirDisplay = document.getElementById('outDirDisplay') as HTMLInputElement;
const convertStatus = document.getElementById('convertStatus')!;
const logArea = document.getElementById('logArea')!;
const historyArea = document.getElementById('historyArea')!;
const chkEmbedded = document.getElementById('chkEmbedded') as HTMLInputElement;
const appVersionDisplay = document.getElementById('appVersionDisplay')!;
const versionDisplay = document.getElementById('versionDisplay')!;
const btnCopyVersion = document.getElementById('btnCopyVersion') as HTMLButtonElement;

const progressModal = document.getElementById('progressModal')!;
const modalTitleText = document.getElementById('modalTitleText')!;
const modalSpinner = document.getElementById('modalSpinner')!;
const modalLogArea = document.getElementById('modalLogArea')!;
const btnCancelConvert = document.getElementById('btnCancelConvert') as HTMLButtonElement;
const btnRevealOutput = document.getElementById('btnRevealOutput') as HTMLButtonElement;
const modalProgress = document.getElementById('modalProgress')!;
const modalProgressFill = document.getElementById('modalProgressFill')!;
const modalProgressText = document.getElementById('modalProgressText')!;
const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;

let isDarkMode = localStorage.getItem('theme') !== 'light';
function applyTheme() {
    if (isDarkMode) {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.textContent = '☀️';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.textContent = '🌙';
    }
}
themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    applyTheme();
});
applyTheme();

let selectedPath: string | null = null;
let selectedKind: PathKind | null = null;
let selectedOutPath: string | null = null;
let isConverting = false;
// What the Reveal Output button shows: for a single project the directory the
// converter said it wrote to, for a batch the folder that was selected, since
// a batch scatters its output through it. Null until a run produces something.
let revealTarget: string | null = null;

// Ask the backend what a path actually is. Every `.sspj`-vs-folder decision in
// the UI goes through this, so the app never disagrees with itself (or with the
// converter) about what a path is. Returns null after logging why on failure.
async function classifyPath(path: string): Promise<PathKind | null> {
    try {
        return await invoke<PathKind>('path_kind', { path });
    } catch (e) {
        log(`Could not inspect ${path}: ${e}`, 'error');
        return null;
    }
}

// Show where the converter will write, without deciding it here. The
// destination of a default run depends on `embedded` — `<name>/` or
// `<name>_emb/` — so pinning it when the input is selected would silently
// ignore the checkbox and let an embedded build overwrite a plain one. The
// path goes in the placeholder; `selectedOutPath` stays null, which sends no
// output directory to the backend and leaves `ssconverter` to resolve it.
async function refreshOutputPlaceholder() {
    if (selectedOutPath !== null) {
        outDirDisplay.placeholder = '';
        return;
    }
    if (selectedKind === 'sspj' && selectedPath) {
        try {
            const dir = await dirname(selectedPath);
            const stem = await basename(selectedPath, '.sspj');
            outDirDisplay.placeholder = await join(dir, defaultOutputName(stem, chkEmbedded.checked));
            return;
        } catch (e) {
            log(`Failed to resolve default output: ${e}`, 'error');
        }
    }
    outDirDisplay.placeholder = selectedKind === 'dir'
        ? "Batch Mode: Output placed next to each .sspj"
        : selectedKind === 'file'
            ? "Leave empty to output next to the source file"
            : "Leave empty to output next to .sspj";
}

async function onInputSelected(path: string, kind: PathKind) {
    selectedPath = path;
    selectedKind = kind;
    inDirDisplay.value = path;
    btnConvert.disabled = false;

    selectedOutPath = null;
    outDirDisplay.value = '';
    await refreshOutputPlaceholder();
}

const MAX_LOG_LINES = 500;
function trimLog(el: HTMLElement) {
    while (el.children.length > MAX_LOG_LINES) {
        el.firstElementChild!.remove();
    }
}

type LogType = 'info' | 'error' | 'success' | 'warning';

function appendLine(el: HTMLElement, msg: string, type: LogType) {
    const div = document.createElement('div');
    div.textContent = msg;
    if (type !== 'info') {
        div.className = `log-${type}`;
    }
    el.appendChild(div);
    trimLog(el);
    el.scrollTop = el.scrollHeight;
}

function log(msg: string, type: LogType = 'info') {
    appendLine(logArea, msg, type);
}

// Backend events go to the main log and to the progress modal, so a running
// conversion is readable without closing the modal.
function logFromBackend(msg: string, type: LogType = 'info') {
    appendLine(logArea, msg, type);
    appendLine(modalLogArea, msg, type);
}

function updateBadge(el: HTMLElement, text: string, type: 'pending' | 'active' | 'success' | 'error' | 'warning') {
    el.textContent = text;
    el.className = `status-badge badge-${type}`;
}

// Read history defensively: corrupt localStorage must not throw and break app
// startup or misreport a successful conversion. `sanitizeHistory` also drops
// individual malformed entries, which would otherwise blow up in rendering.
function loadHistory(): HistoryItem[] {
    try {
        return sanitizeHistory(JSON.parse(localStorage.getItem('convert_history') || '[]'));
    } catch {
        return [];
    }
}

function saveHistory(item: HistoryItem) {
    const history = updateHistory(loadHistory(), item, 100);
    localStorage.setItem('convert_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history: HistoryItem[] = loadHistory();
    historyArea.innerHTML = '';
    if (history.length === 0) {
        // Static markup only (no user-controlled data) — safe.
        historyArea.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem;">No history yet.</div>';
        return;
    }

    history.forEach(item => {
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.9rem;';

        // Paths are arbitrary and may contain HTML metacharacters (`"`, `<`, `>`
        // are all legal in file/dir names on macOS/Linux), so build the row with
        // textContent / property assignment — never string-interpolated
        // innerHTML — to avoid DOM injection from a maliciously named path.
        const info = document.createElement('div');
        info.style.cssText = 'display: flex; flex-direction: column; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

        const pathSpan = document.createElement('span');
        pathSpan.style.cssText = 'font-weight: 500; color: var(--text-primary);';
        pathSpan.title = item.inputPath;
        pathSpan.textContent = item.inputPath.length > 40 ? '...' + item.inputPath.slice(-37) : item.inputPath;

        const metaSpan = document.createElement('span');
        metaSpan.style.cssText = 'font-size: 0.8rem; color: var(--text-muted);';
        const when = new Date(item.timestamp);
        const stamp = Number.isFinite(when.getTime())
            ? when.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
            : '';
        const meta = [historySummary(item), stamp].filter(Boolean).join(' · ');
        metaSpan.textContent = meta;
        // The column clips this line; the tooltip is where the whole of it is.
        metaSpan.title = meta;

        info.append(pathSpan, metaSpan);

        const btn = document.createElement('button');
        btn.className = 'btn btn-history-retry';
        btn.style.cssText = 'padding: 0.4rem 0.75rem; font-size: 0.85rem; background: var(--primary-color); color: white;';
        btn.textContent = '⚡ Convert';
        // A conversion may finish and re-render the list while the previous one
        // is still tearing down, so honour the current busy state here too.
        btn.disabled = isConverting;
        btn.addEventListener('click', async () => {
            if (isConverting) return;

            const kind = await classifyPath(item.inputPath);
            if (!kind) return;
            if (kind === 'missing') {
                log(`History entry no longer exists: ${item.inputPath}`, 'error');
                return;
            }

            selectedPath = item.inputPath;
            selectedKind = kind;
            inDirDisplay.value = selectedPath;
            // Replay exactly what the recorded run used. `outputPath: null`
            // means the run chose no directory and let the converter resolve
            // one; substituting a path here — even the one the converter would
            // pick — would pin it and stop the retry reproducing the original.
            selectedOutPath = item.outputPath;
            outDirDisplay.value = selectedOutPath || '';
            chkEmbedded.checked = item.embedded;
            await refreshOutputPlaceholder();
            btnConvert.disabled = false;

            log(`Re-converting from history: ${selectedPath}`);
            await runConversion();
        });

        div.append(info, btn);
        historyArea.appendChild(div);
    });
}

// Which field a drop lands in. Both boxes are drawn as drop zones, so both
// have to accept one; anywhere else on the window goes to the input, which is
// the forgiving reading of a drop that missed. Native drag-drop suppresses
// HTML5 dragover/drop, so this rides Tauri's window events, and the same
// function decides the highlight and the drop — the outline always predicts
// where the path will go.
type DropZone = 'in' | 'out';

function zoneAt(pos?: { x: number; y: number }): DropZone {
    if (!pos) return 'in'; // No position info: fall back to the input.
    const dpr = window.devicePixelRatio || 1;
    const x = pos.x / dpr;
    const y = pos.y / dpr;
    const rect = dropZoneOut.getBoundingClientRect();
    const overOut = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    return overOut ? 'out' : 'in';
}

function updateDragHighlight(pos?: { x: number; y: number }) {
    const zone = zoneAt(pos);
    dropZoneIn.classList.toggle('dragover', zone === 'in');
    dropZoneOut.classList.toggle('dragover', zone === 'out');
}

function clearDragHighlight() {
    dropZoneIn.classList.remove('dragover');
    dropZoneOut.classList.remove('dragover');
}

listen<{ position?: { x: number; y: number } }>('tauri://drag-enter', event => updateDragHighlight(event.payload.position));
listen<{ position?: { x: number; y: number } }>('tauri://drag-over', event => updateDragHighlight(event.payload.position));
listen('tauri://drag-leave', clearDragHighlight);

// Handle a dropped path, classifying it by its real filesystem type rather than
// guessing from the path string (a folder can be named `assets.bak`, a file can
// have no extension).
async function handleDrop(paths: string[] | undefined, pos?: { x: number; y: number }) {
    const zone = zoneAt(pos);
    clearDragHighlight();
    if (isConverting) {
        log('A conversion is already running — dropped item ignored.', 'warning');
        return;
    }
    if (!paths || paths.length === 0) return;
    // Only one path can be acted on: `convert_sspj` takes a single input and
    // the output is a single directory. Say so rather than letting the rest of
    // a multiple selection look accepted.
    if (paths.length > 1) {
        log(`Dropped ${paths.length} items; using only the first. Drop one at a time, or drop a folder that contains them.`, 'warning');
    }
    const path = paths[0];
    const kind = await classifyPath(path);
    if (!kind) return;

    if (zone === 'out') {
        if (kind !== 'dir') {
            log(`The output must be a folder, and this is not one: ${path}`, 'error');
            return;
        }
        selectedOutPath = path;
        outDirDisplay.value = path;
        await refreshOutputPlaceholder();
        log(`Dropped Output: ${path}`);
        return;
    }

    if (kind !== 'dir' && kind !== 'sspj') {
        log(`Dropped item is not a .sspj file or a folder: ${path}`, 'error');
        return;
    }
    await onInputSelected(path, kind);
    log(`Dropped Input: ${path}`);
}

listen<{ paths: string[]; position?: { x: number; y: number } }>('tauri://drag-drop', event => handleDrop(event.payload.paths, event.payload.position));

// Converter progress from the backend. Failures and warnings arrive on their
// own events so they keep their severity; the summary returned by
// `convert_sspj` is used for counts only and never re-logs them.
// A determinate bar: a spinner says nothing about how far into a fifty-project
// batch a run is. The file being converted is already named in the log below.
function showProgress(done: number, total: number) {
    modalProgress.style.display = 'block';
    const ratio = total > 0 ? done / total : 0;
    modalProgressFill.style.width = `${Math.round(ratio * 100)}%`;
    modalProgressText.textContent = `${done} / ${total}`;
}

listen<{ done: number; total: number }>('convert-progress', event => showProgress(event.payload.done, event.payload.total));

listen<string>('convert-log', event => logFromBackend(event.payload));
listen<string>('convert-warning', event => logFromBackend(event.payload, 'warning'));
listen<string>('convert-error', event => logFromBackend(event.payload, 'error'));

btnRevealOutput.addEventListener('click', async () => {
    if (!revealTarget) return;
    try {
        // `revealItemInDir`, not `openPath`: it is what `opener:default` already
        // grants, so this needs no widening of `capabilities/default.json`.
        await revealItemInDir(revealTarget);
    } catch (e) {
        log(`Could not reveal ${revealTarget}: ${e}`, 'error');
    }
});

btnCancelConvert.addEventListener('click', async () => {
    btnCancelConvert.disabled = true;
    modalTitleText.textContent = 'Cancelling... Please wait.';
    modalSpinner.style.display = 'none';
    await invoke('cancel_conversion');
});

btnSelectInFile.addEventListener('click', async () => {
    try {
        const file = await open({
            multiple: false,
            directory: false,
            filters: [{ name: 'SpriteStudio Project', extensions: ['sspj'] }]
        });
        if (file) {
            const path = file as string;
            const kind = await classifyPath(path);
            if (!kind) return;
            if (kind === 'missing') {
                log(`Selected file no longer exists: ${path}`, 'error');
                return;
            }
            await onInputSelected(path, kind);
            log(`Selected Input File: ${path}`);
        }
    } catch (e: any) {
        log(`Error: ${e.message || e}`, 'error');
    }
});

btnSelectInDir.addEventListener('click', async () => {
    try {
        const dir = await open({
            multiple: false,
            directory: true
        });
        if (dir) {
            const path = dir as string;
            const kind = await classifyPath(path);
            if (!kind) return;
            if (kind === 'missing') {
                log(`Selected folder no longer exists: ${path}`, 'error');
                return;
            }
            await onInputSelected(path, kind);
            log(`Selected Input Folder: ${path}`);
        }
    } catch (e: any) {
        log(`Error: ${e.message || e}`, 'error');
    }
});

btnSelectOut.addEventListener('click', async () => {
    try {
        const dir = await open({
            multiple: false,
            directory: true
        });
        if (dir) {
            selectedOutPath = dir as string;
            outDirDisplay.value = selectedOutPath;
            await refreshOutputPlaceholder();
            log(`Selected Output: ${selectedOutPath}`);
        }
    } catch (e: any) {
        log(`Error: ${e.message || e}`, 'error');
    }
});

btnClearOut.addEventListener('click', () => {
    selectedOutPath = null;
    outDirDisplay.value = '';
    void refreshOutputPlaceholder();
    log('Cleared output directory. Will use default location.');
});

// The default output directory gains an `_emb` suffix when assets are
// embedded, so the placeholder has to follow the checkbox.
chkEmbedded.addEventListener('change', () => { void refreshOutputPlaceholder(); });

// Lock every control that feeds a conversion. The backend keeps a single
// cancel flag shared by all runs, so two concurrent conversions would cancel
// and un-cancel each other; keeping the inputs frozen also guarantees the
// options recorded in history are the ones the run actually used.
function setBusy(busy: boolean) {
    isConverting = busy;
    btnConvert.disabled = busy || !selectedPath;
    btnSelectInFile.disabled = busy;
    btnSelectInDir.disabled = busy;
    btnSelectOut.disabled = busy;
    btnClearOut.disabled = busy;
    btnClearHistory.disabled = busy;
    chkEmbedded.disabled = busy;
    btnRevealOutput.disabled = busy;
    historyArea.querySelectorAll<HTMLButtonElement>('.btn-history-retry')
        .forEach(retry => { retry.disabled = busy; });
}

async function runConversion() {
    if (isConverting || !selectedPath) return;

    // Snapshot everything the run depends on before the await.
    const inputPath = selectedPath;
    const isSingleFile = selectedKind !== 'dir';
    const outputPath = selectedOutPath;
    const embedded = chkEmbedded.checked;

    try {
        setBusy(true);

        updateBadge(convertStatus, 'Converting...', 'active');
        log('Starting conversion...');

        // Setup and show modal. The bar stays hidden until the backend has
        // counted the projects, which for a folder means after the scan.
        modalLogArea.replaceChildren();
        modalTitleText.textContent = isSingleFile ? 'Converting Project...' : 'Scanning & Converting...';
        modalSpinner.style.display = 'inline-block';
        modalProgress.style.display = 'none';
        modalProgressFill.style.width = '0%';
        btnCancelConvert.disabled = false;
        btnRevealOutput.style.display = 'none';
        revealTarget = null;
        progressModal.style.display = 'flex';

        const startTime = performance.now();
        const result = await invoke<ConvertSummary>('convert_sspj', {
            inputPath,
            outputPath,
            embedded
        });
        const endTime = performance.now();
        log(`Conversion finished in ${(endTime - startTime).toFixed(2)} ms.`);

        // Individual failures and warnings were already logged from their
        // backend events — only the totals are reported here.
        const { succeeded, failed, warnings, output_dirs } = result;
        const plural = (n: number) => n === 1 ? '' : 's';

        if (failed.length > 0 && succeeded.length === 0) {
            updateBadge(convertStatus, 'Failed', 'error');
            log(`Conversion failed for ${failed.length} project${plural(failed.length)}.`, 'error');
        } else if (failed.length > 0) {
            updateBadge(convertStatus, `${succeeded.length} ok / ${failed.length} failed`, 'warning');
            log(`Converted ${succeeded.length}, failed ${failed.length}.`, 'warning');
        } else if (warnings.length > 0) {
            updateBadge(convertStatus, `${succeeded.length} ok (incomplete)`, 'warning');
            log(`Converted ${succeeded.length} project${plural(succeeded.length)}, but the scan was incomplete.`, 'warning');
        } else {
            updateBadge(convertStatus, 'Success', 'success');
            log(`Successfully converted ${succeeded.length} project${plural(succeeded.length)}.`, 'success');
        }

        // One project: reveal the directory the converter reported. A batch
        // scatters its output beside each `.sspj`, so the folder that was
        // selected is the only place that holds all of it.
        revealTarget = isSingleFile ? (output_dirs[0] ?? null) : inputPath;
        btnRevealOutput.style.display = succeeded.length > 0 && revealTarget ? 'inline-flex' : 'none';

        // One history entry per run, keyed by what was selected. Recording one
        // per `.sspj` filled the list with rows nobody had chosen and left the
        // folder of a batch — the thing you would want to run again — absent.
        if (succeeded.length > 0) {
            saveHistory({
                inputPath,
                outputPath,
                embedded,
                count: succeeded.length,
                timestamp: Date.now(),
            });
        }
    } catch (e: any) {
        log(`Error/Cancelled: ${e}`, 'error');
        updateBadge(convertStatus, 'Failed/Cancelled', 'error');
    } finally {
        progressModal.style.display = 'none';
        setBusy(false);
    }
}

btnConvert.addEventListener('click', runConversion);

btnClearLog.addEventListener('click', () => {
    logArea.replaceChildren();
});

btnClearHistory.addEventListener('click', () => {
    localStorage.removeItem('convert_history');
    renderHistory();
    log('Cleared history.');
});

async function loadVersions() {
    try {
        const info = await invoke<{ app_version: string; converter_version: string; ssab_schema_version: number; ssqb_schema_version: number }>('get_versions');
        const schemas = `ssab v${info.ssab_schema_version}, ssqb v${info.ssqb_schema_version}`;
        appVersionDisplay.textContent = `App Version: ${info.app_version}`;
        versionDisplay.textContent = `Converter Version: ${info.converter_version} (${schemas})`;
        btnCopyVersion.style.display = 'inline-flex';
        btnCopyVersion.onclick = async () => {
            try {
                const textToCopy = `App Version: ${info.app_version}\nConverter Version: ${info.converter_version} (${schemas})`;
                await navigator.clipboard.writeText(textToCopy);
                const orig = btnCopyVersion.textContent;
                btnCopyVersion.textContent = 'Copied!';
                setTimeout(() => { btnCopyVersion.textContent = orig; }, 2000);
            } catch (e) {
                log('Failed to copy version.', 'error');
            }
        };
    } catch (e: any) {
        appVersionDisplay.textContent = 'App Version: unknown';
        versionDisplay.textContent = `Converter Version: unavailable (${e.message || e})`;
    }
}

// Initial render
renderHistory();
loadVersions();
