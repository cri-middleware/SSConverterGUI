import { invoke } from '@tauri-apps/api/core';
import { open, confirm } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { dirname, basename, join } from '@tauri-apps/api/path';
import {
    updateHistory, sanitizeHistory, defaultOutputName, historySummary, HistoryItem,
    parseThemeChoice, nextThemeChoice, resolveTheme, describeRun, describeCancelled, shortcutAction, resultText, ThemeChoice, RunTone,
} from './utils';
import './style.css';

// Mirrors the Rust `ConvertSummary` returned by the `convert_sspj` command.
interface ConvertSummary {
    succeeded: string[];
    failed: { path: string; error: string }[];
    // Every distinct directory the converter reported writing to, in order.
    output_dirs: string[];
    warnings: string[];
    // Stop ended the run at the file in flight; the lists above hold what
    // ended before it.
    cancelled: boolean;
    // How many `.sspj` the run set out to convert.
    total: number;
}

// Mirrors the Rust `path_kind` command: the real filesystem type of a path,
// with `.sspj` recognised exactly as the converter recognises it.
type PathKind = 'sspj' | 'file' | 'dir' | 'missing';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="header">
    <h1>SSConverter GUI</h1>
    <p>Convert SpriteStudio projects (.sspj) to binaries (.ssab / .ssqb)</p>
  </div>
  
  <div class="panel">
    <div class="form-group drop-zone" id="dropZoneIn">
      <label class="zone-label">
        <span class="zone-title" id="inputTitle">📥 Target .sspj File or Folder</span>
      </label>
      <div class="input-row">
        <input type="text" id="inDirDisplay" readonly aria-labelledby="inputTitle" placeholder="Select or drop a SpriteStudio Project / Folder...">
        <button class="btn" id="btnSelectInFile">File...</button>
        <button class="btn" id="btnSelectInDir">Folder...</button>
      </div>
    </div>

    <div class="input-row output-row" id="dropZoneOut">
      <span class="output-label">📤 Output</span>
      <input type="text" id="outDirDisplay" readonly aria-label="Output folder" placeholder="Leave empty to output next to .sspj">
      <button class="btn btn-secondary btn-small" id="btnSelectOut" aria-label="Change output folder">Change...</button>
      <button class="btn btn-secondary btn-small" id="btnClearOut" aria-label="Reset output folder" hidden>Reset</button>
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
      <span class="status-badge badge-pending" id="convertStatus" role="status">Waiting</span>
      <button class="btn btn-secondary" id="btnRevealOutput" hidden title="Show the output in the file manager">📂 Reveal Output</button>
    </div>

    <div class="panes">
      <!-- History Area -->
      <div class="pane">
        <div class="pane-head">
          <h2 class="pane-title">History</h2>
          <button class="btn btn-secondary btn-small" id="btnClearHistory">Clear History</button>
        </div>
        <div class="history-list" id="historyArea"></div>
      </div>

      <!-- Logs Area -->
      <div class="pane">
        <div class="pane-head">
          <h2 class="pane-title" id="logTitle">Logs</h2>
          <div class="pane-actions">
            <button class="btn btn-secondary btn-small" id="btnCopyLog">Copy Logs</button>
            <button class="btn btn-secondary btn-small" id="btnClearLog">Clear Logs</button>
          </div>
        </div>
        <div class="log-area log-area-fill" id="logArea" role="log" aria-labelledby="logTitle"></div>
      </div>
    </div>
  </div>

  <div class="app-footer">
    <span id="appVersionDisplay">App Version: Loading...</span>
    <span id="versionDisplay">Converter Version: Loading...</span>
    <button class="btn btn-secondary btn-tiny" id="btnCopyVersion" hidden title="Copy Versions">Copy Versions</button>
  </div>

  <!-- Progress, then result. A modal <dialog>: the rest of the window is inert while it is open, Tab stays inside it, and Esc arrives as a \`cancel\` event. -->
  <dialog id="progressModal" class="modal" data-view="run" aria-labelledby="modalTitleText" tabindex="-1">
    <h3 class="modal-title">
      <div class="spinner view-run" id="modalSpinner"></div>
      <span class="view-result" id="modalIcon" aria-hidden="true"></span>
      <span id="modalTitleText">Processing...</span>
    </h3>
    <div class="modal-progress view-run" id="modalProgress" hidden>
      <div class="progress-track"><div class="progress-fill" id="modalProgressFill"></div></div>
      <div class="modal-progress-text" id="modalProgressText"></div>
    </div>
    <div class="modal-log view-run" id="modalLogArea"></div>
    <div class="modal-actions view-run" id="modalRunActions">
      <button class="btn btn-danger" id="btnCancelConvert">Stop / Cancel</button>
    </div>
    <!-- What the dialog turns into when the run ends. -->
    <div class="view-result" id="modalResult">
      <div class="result-output" id="resultOutput" hidden></div>
      <div class="result-issues" id="resultIssues" hidden></div>
      <div class="result-actions">
        <button class="btn btn-secondary" id="btnResultCopy" title="Copy the result as text">Copy</button>
        <button class="btn btn-secondary" id="btnResultReveal" title="Show the output in the file manager">📂 Reveal Output</button>
        <button class="btn" id="btnResultClose">Close</button>
      </div>
    </div>
  </dialog>

  <button id="themeToggle" class="theme-toggle" aria-label="Toggle Theme" title="Toggle Theme">☀️</button>
`;

const btnSelectInFile = document.getElementById('btnSelectInFile') as HTMLButtonElement;
const btnSelectInDir = document.getElementById('btnSelectInDir') as HTMLButtonElement;
const btnSelectOut = document.getElementById('btnSelectOut') as HTMLButtonElement;
const btnClearOut = document.getElementById('btnClearOut') as HTMLButtonElement;
const btnConvert = document.getElementById('btnConvert') as HTMLButtonElement;
const btnCopyLog = document.getElementById('btnCopyLog') as HTMLButtonElement;
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

const progressModal = document.getElementById('progressModal') as HTMLDialogElement;
const modalTitleText = document.getElementById('modalTitleText')!;
const modalSpinner = document.getElementById('modalSpinner')!;
const modalLogArea = document.getElementById('modalLogArea')!;
const btnCancelConvert = document.getElementById('btnCancelConvert') as HTMLButtonElement;
const btnRevealOutput = document.getElementById('btnRevealOutput') as HTMLButtonElement;
const modalProgress = document.getElementById('modalProgress')!;
const modalProgressFill = document.getElementById('modalProgressFill')!;
const modalProgressText = document.getElementById('modalProgressText')!;
const modalIcon = document.getElementById('modalIcon')!;
const resultOutput = document.getElementById('resultOutput')!;
const resultIssues = document.getElementById('resultIssues')!;
const btnResultCopy = document.getElementById('btnResultCopy') as HTMLButtonElement;
const btnResultReveal = document.getElementById('btnResultReveal') as HTMLButtonElement;
const btnResultClose = document.getElementById('btnResultClose') as HTMLButtonElement;
const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;

// The theme follows the system until the button is used; a stored `light` or
// `dark` is that choice, and `auto` is the button's way back to the system.
// The icon shows the current choice, not the one a click would switch to.
const THEME_ICON: Record<ThemeChoice, string> = { auto: '🖥️', light: '☀️', dark: '🌙' };
const THEME_LABEL: Record<ThemeChoice, string> = {
    auto: 'Theme: follow system',
    light: 'Theme: light',
    dark: 'Theme: dark',
};
const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)');
let themeChoice = parseThemeChoice(localStorage.getItem('theme'));
function applyTheme() {
    if (resolveTheme(themeChoice, systemPrefersLight.matches) === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    const label = `${THEME_LABEL[themeChoice]} (click to change)`;
    themeToggle.textContent = THEME_ICON[themeChoice];
    themeToggle.title = label;
    themeToggle.setAttribute('aria-label', label);
}
themeToggle.addEventListener('click', () => {
    themeChoice = nextThemeChoice(themeChoice);
    if (themeChoice === 'auto') {
        localStorage.removeItem('theme');
    } else {
        localStorage.setItem('theme', themeChoice);
    }
    applyTheme();
});
// The system switching (a scheduled dark mode, say) matters only while `auto`,
// and `applyTheme` already resolves a chosen theme back to itself.
systemPrefersLight.addEventListener('change', applyTheme);
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
        const kind = await invoke<PathKind>('path_kind', { path });
        // A run can have started during that await, and its inputs are frozen.
        return isConverting ? null : kind;
    } catch (e) {
        log(`Could not inspect ${path}: ${e}`, 'error');
        return null;
    }
}

// An output folder is for one project. A folder batch writes each project next
// to its own `.sspj` and `convert_sspj` ignores `output_path` for it, so the
// output controls are off then instead of taking a path that would be dropped.
// Everything that can change the selection or the busy state ends up here, so
// `selectedOutPath` is null whenever the input is a folder.
function outputApplies(): boolean {
    return selectedKind !== 'dir';
}

function syncOutputAvailability() {
    const applies = outputApplies();
    btnSelectOut.disabled = isConverting || !applies;
    btnClearOut.disabled = isConverting || !applies;
    btnClearOut.hidden = selectedOutPath === null;
    dropZoneOut.classList.toggle('is-disabled', !applies);
}

// Show where the converter will write, without deciding it here. The
// destination of a default run depends on `embedded` — `<name>/` or
// `<name>_emb/` — so pinning it when the input is selected would silently
// ignore the checkbox and let an embedded build overwrite a plain one. The
// path goes in the placeholder; `selectedOutPath` stays null, which sends no
// output directory to the backend and leaves `ssconverter` to resolve it.
async function refreshOutputPlaceholder() {
    syncOutputAvailability();
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
        ? "Batch: each project is written next to its own .sspj"
        : "Leave empty to output next to .sspj";
}

async function onInputSelected(path: string, kind: PathKind) {
    selectedPath = path;
    selectedKind = kind;
    inDirDisplay.value = path;
    btnConvert.disabled = false;
    // The badge and Reveal Output describe the last run, not this input.
    updateBadge(convertStatus, 'Waiting', 'pending');
    btnRevealOutput.hidden = true;
    revealTarget = null;

    // A chosen output folder stays for the next project, so it can be set once
    // and several projects dropped in turn. The default is not kept here
    // (`selectedOutPath` stays null and the converter resolves it), so nothing
    // held over is derived from the previous input. A folder batch has no
    // output folder, so the choice cannot follow it; say so rather than
    // dropping it silently.
    if (kind === 'dir' && selectedOutPath !== null) {
        log(`Output folder cleared: a folder batch writes each project next to its own .sspj (was ${selectedOutPath}).`);
        selectedOutPath = null;
        outDirDisplay.value = '';
    }
    await refreshOutputPlaceholder();
    // The next thing to do is Convert, so Enter is one key away.
    btnConvert.focus();
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
        historyArea.innerHTML = '<div class="history-empty">No history yet.</div>';
        return;
    }

    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';

        // Paths are arbitrary and may contain HTML metacharacters (`"`, `<`, `>`
        // are all legal in file/dir names on macOS/Linux), so build the row with
        // textContent / property assignment — never string-interpolated
        // innerHTML — to avoid DOM injection from a maliciously named path.
        const info = document.createElement('div');
        info.className = 'history-info';

        const pathSpan = document.createElement('span');
        pathSpan.className = 'history-path';
        pathSpan.title = item.inputPath;
        pathSpan.textContent = item.inputPath.length > 40 ? '...' + item.inputPath.slice(-37) : item.inputPath;

        const metaSpan = document.createElement('span');
        metaSpan.className = 'history-meta';
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
        btn.textContent = '⚡ Convert';
        // Every row's button reads the same, so its name says which entry it runs.
        btn.setAttribute('aria-label', `Convert again: ${item.inputPath}`);
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
            if (kind !== 'sspj' && kind !== 'dir') {
                log(`History entry is no longer a .sspj file or a folder: ${item.inputPath}`, 'error');
                return;
            }

            selectedPath = item.inputPath;
            selectedKind = kind;
            inDirDisplay.value = selectedPath;
            // Replay exactly what the recorded run used. `outputPath: null`
            // means the run chose no directory and let the converter resolve
            // one; substituting a path here — even the one the converter would
            // pick — would pin it and stop the retry reproducing the original.
            selectedOutPath = kind === 'dir' ? null : item.outputPath;
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

const isMac = /Mac/.test(navigator.platform);

function zoneAt(pos?: { x: number; y: number }): DropZone {
    if (!pos) return 'in'; // No position info: fall back to the input.
    // wry reports a drop in points on macOS, which are already CSS pixels, and
    // in physical pixels on Windows.
    const scale = isMac ? 1 : (window.devicePixelRatio || 1);
    const x = pos.x / scale;
    const y = pos.y / scale;
    const rect = dropZoneOut.getBoundingClientRect();
    const overOut = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    return overOut ? 'out' : 'in';
}

function updateDragHighlight(pos?: { x: number; y: number }) {
    const zone = zoneAt(pos);
    dropZoneIn.classList.toggle('dragover', zone === 'in');
    // No outline on an output box that is switched off: nothing will land there.
    dropZoneOut.classList.toggle('dragover', zone === 'out' && outputApplies());
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
    // The result dialog covers the window; a drop behind it would change the
    // selection where nobody can see it.
    if (isResultOpen()) return;
    if (isConverting) {
        log('A conversion is already running — dropped item ignored.', 'warning');
        return;
    }
    if (!paths || paths.length === 0) return;
    // Refused rather than redirected to the input: a folder meant as the output
    // would otherwise become the folder that gets converted.
    if (zone === 'out' && !outputApplies()) {
        log('A folder batch writes each project next to its own .sspj, so there is no output folder to set. Select a single .sspj to choose one.', 'warning');
        return;
    }
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

function showProgress(done: number, total: number) {
    modalProgress.hidden = false;
    const ratio = total > 0 ? done / total : 0;
    modalProgressFill.style.width = `${Math.round(ratio * 100)}%`;
    modalProgressText.textContent = `${done} / ${total}`;
}

listen<{ done: number; total: number }>('convert-progress', event => showProgress(event.payload.done, event.payload.total));

listen<string>('convert-log', event => logFromBackend(event.payload));
listen<string>('convert-warning', event => logFromBackend(event.payload, 'warning'));
listen<string>('convert-error', event => logFromBackend(event.payload, 'error'));

// The result dialog holds the window inert, so the log behind it goes unseen.
function reportFailure(msg: string) {
    log(msg, 'error');
    if (isResultOpen()) {
        resultIssues.prepend(renderIssue({ detail: msg, tone: 'error' }));
        resultIssues.hidden = false;
        resultIssues.scrollTop = 0;
    }
}

async function revealOutput() {
    if (!revealTarget) return;
    try {
        // Opens the folder itself. The opener plugin's `revealItemInDir` would
        // open its parent and select it, which is not where the output is.
        await invoke('open_folder', { path: revealTarget });
    } catch (e) {
        reportFailure(`Could not open ${revealTarget}: ${e}`);
    }
}

btnRevealOutput.addEventListener('click', revealOutput);
btnResultReveal.addEventListener('click', revealOutput);

// The dialog has two faces. While a run is going it is the progress view above;
// when the run ends it becomes the result, so what happened — above all which
// projects failed, and why — is in front of the user rather than only in a log
// that keeps scrolling. Failures and warnings were already logged live; this is
// where they are listed.
const TONE_ICON: Record<RunTone, string> = { success: '✅', warning: '⚠️', error: '❌' };

interface ResultIssue {
    // The project a failure belongs to; absent for a message about the run.
    label?: string;
    detail: string;
    tone: 'warning' | 'error';
}

interface ResultView {
    tone: RunTone;
    headline: string;
    output: string | null;
    issues: ResultIssue[];
    canReveal: boolean;
}

// The views are switched by `data-view` on the dialog (see `.view-run` and
// `.view-result` in style.css), so the state lives in one place.
function isResultOpen(): boolean {
    return progressModal.open && progressModal.dataset.view === 'result';
}

// True while a run owns the dialog: it cannot be dismissed, only stopped.
let modalPinned = false;

function openModal() {
    progressModal.showModal();
    // `showModal` focuses the first control, which is Stop. An Enter still held
    // down from pressing Convert would repeat onto it and cancel the run at
    // once, so focus the dialog itself; Tab reaches Stop from there.
    progressModal.focus();
}

function showRunView() {
    progressModal.dataset.view = 'run';
    modalPinned = true;
    modalSpinner.hidden = false;
    modalProgress.hidden = true;
    modalProgressFill.style.width = '0%';
    btnCancelConvert.disabled = false;
}

// Paths and converter messages are arbitrary text, so rows are built with
// textContent, like the history list.
function renderIssue(issue: ResultIssue): HTMLElement {
    const row = document.createElement('div');
    row.className = `result-issue result-issue-${issue.tone}`;
    if (issue.label) {
        const label = document.createElement('div');
        label.className = 'result-issue-label';
        label.textContent = issue.label;
        row.appendChild(label);
    }
    const detail = document.createElement('div');
    detail.className = 'result-issue-detail';
    detail.textContent = issue.detail;
    row.appendChild(detail);
    return row;
}

// What the result dialog is showing, for Copy.
let shownResult: ResultView | null = null;
// The versions as Copy Versions copies them, once they have loaded.
let versionsText: string | null = null;

function showResult(view: ResultView) {
    shownResult = view;
    progressModal.dataset.view = 'result';
    modalPinned = false;
    modalIcon.textContent = TONE_ICON[view.tone];
    modalTitleText.textContent = view.headline;

    resultOutput.textContent = view.output ?? '';
    resultOutput.hidden = !view.output;
    resultIssues.replaceChildren(...view.issues.map(renderIssue));
    resultIssues.hidden = view.issues.length === 0;
    btnResultReveal.hidden = !view.canReveal;

    btnResultClose.focus();
}

function closeModal() {
    modalPinned = false;
    if (progressModal.open) progressModal.close();
}

btnResultClose.addEventListener('click', closeModal);

const copiedTimers = new Map<HTMLButtonElement, number>();

function flashCopied(button: HTMLButtonElement) {
    button.dataset.label ??= button.textContent ?? '';
    button.textContent = 'Copied!';
    window.clearTimeout(copiedTimers.get(button));
    copiedTimers.set(button, window.setTimeout(() => { button.textContent = button.dataset.label ?? ''; }, 2000));
}

btnResultCopy.addEventListener('click', async () => {
    if (!shownResult) return;
    try {
        await navigator.clipboard.writeText(resultText(shownResult, versionsText));
        flashCopied(btnResultCopy);
    } catch (e) {
        reportFailure('Failed to copy the result.');
    }
});

// A run owns the dialog until it ends: put it back if something closed it.
function keepOpen() {
    if (modalPinned && !progressModal.open) openModal();
}

// Esc asks to close the dialog. While a run owns it that would leave the run
// going with nothing on screen, so it is refused; Stop is the way out. Once
// the result is up, Esc closes it like Close does.
progressModal.addEventListener('cancel', event => {
    if (!modalPinned) return;
    event.preventDefault();
    // Chrome makes `cancel` uncancelable on a second Esc with no click between,
    // and closes the dialog anyway; this puts it back once that has happened.
    setTimeout(keepOpen, 0);
});

// Focus returns to Convert when the dialog closes, where the run was started
// from, so Enter can go again. A run that still owns it is put back instead.
progressModal.addEventListener('close', () => {
    if (modalPinned) {
        keepOpen();
        return;
    }
    btnConvert.focus();
});

// Set when Stop is pressed, so a run that ends in an error can be told apart
// from one the user cut short during the directory scan: the backend reports
// both as an `Err`.
let cancelRequested = false;

btnCancelConvert.addEventListener('click', async () => {
    cancelRequested = true;
    btnCancelConvert.disabled = true;
    modalTitleText.textContent = 'Cancelling... Please wait.';
    modalSpinner.hidden = true;
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
            // The dialog's filter is a hint, not a check: Windows matches it
            // case-insensitively and takes any name typed into the box. Refuse
            // what the converter would not call a project, as a drop does.
            if (kind !== 'sspj') {
                log(`Selected file is not a .sspj file: ${path}`, 'error');
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

// Lock every control that feeds a conversion, so the options recorded in history
// are the ones the run actually used.
function setBusy(busy: boolean) {
    isConverting = busy;
    btnConvert.disabled = busy || !selectedPath;
    btnSelectInFile.disabled = busy;
    btnSelectInDir.disabled = busy;
    syncOutputAvailability();
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
        cancelRequested = false;
        modalLogArea.replaceChildren();
        modalTitleText.textContent = isSingleFile ? 'Converting Project...' : 'Scanning & Converting...';
        showRunView();
        btnRevealOutput.hidden = true;
        revealTarget = null;
        openModal();

        const startTime = performance.now();
        const result = await invoke<ConvertSummary>('convert_sspj', {
            inputPath,
            outputPath,
            embedded
        });
        const endTime = performance.now();
        log(`Conversion finished in ${(endTime - startTime).toFixed(2)} ms.`);

        // Individual failures and warnings were already logged from their
        // backend events — only the totals are logged here.
        const { succeeded, failed, warnings, output_dirs, cancelled, total } = result;

        // One project: reveal the directory the converter reported. A batch
        // scatters its output beside each `.sspj`, so the folder that was
        // selected is the only place that holds all of it.
        revealTarget = isSingleFile ? (output_dirs[0] ?? null) : inputPath;
        const canReveal = succeeded.length > 0 && revealTarget !== null;
        btnRevealOutput.hidden = !canReveal;

        const outcome = cancelled
            ? describeCancelled(succeeded.length, failed.length, total)
            : describeRun(succeeded.length, failed.length, warnings.length > 0);
        updateBadge(convertStatus, outcome.badge, outcome.tone);
        log(outcome.message, outcome.tone);

        // A clean run needs no dialog: the badge says Success and Reveal Output
        // is beside it. Nor does a stopped one: Stop asked for the run to end,
        // not for a report, and the badge says how far it got. The dialog stays
        // for what needs reading, which is a failure or a scan that stopped early.
        if (cancelled || outcome.tone === 'success') {
            closeModal();
        } else {
            showResult({
                tone: outcome.tone,
                headline: outcome.message,
                output: !canReveal ? null
                    : isSingleFile ? `Output: ${revealTarget}`
                    : `Output: next to each .sspj under ${revealTarget}`,
                issues: [
                    ...failed.map(f => ({ label: f.path, detail: f.error, tone: 'error' as const })),
                    ...warnings.map(w => ({ detail: w, tone: 'warning' as const })),
                ],
                canReveal,
            });
        }

        // One history entry per run, keyed by what was selected.
        // A stopped batch is kept too: running it again is how it gets finished.
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
        if (cancelRequested) {
            // A stop during the directory scan arrives as an error, before
            // anything was converted; there is nothing to report but that it
            // stopped. A stop once converting began is a `cancelled` summary.
            log(`${e}`, 'warning');
            updateBadge(convertStatus, 'Cancelled', 'warning');
            closeModal();
        } else {
            log(`Error: ${e}`, 'error');
            updateBadge(convertStatus, 'Failed', 'error');
            showResult({
                tone: 'error',
                headline: 'Conversion failed.',
                output: null,
                issues: [{ detail: `${e}`, tone: 'error' }],
                canReveal: false,
            });
        }
    } finally {
        setBusy(false);
        // A cancelled run leaves no dialog to hand focus back from.
        if (!progressModal.open) btnConvert.focus();
    }
}

btnConvert.addEventListener('click', runConversion);

// Keyboard shortcuts for the three things done every time. They press the
// button, so a disabled one (a run in progress) ignores them exactly as a click
// is ignored. Not while the dialog is open: the window behind it is inert.
const modKey = isMac ? '⌘' : 'Ctrl+';
const shiftKey = isMac ? '⇧' : 'Shift+';
btnSelectInFile.title = `Choose a .sspj (${modKey}O)`;
btnSelectInDir.title = `Choose a folder (${modKey}${shiftKey}O)`;
btnConvert.title = `Convert (${modKey}Enter)`;

document.addEventListener('keydown', event => {
    if (progressModal.open) return;
    const action = shortcutAction(event);
    if (!action) return;
    event.preventDefault();
    const button = { 'open-file': btnSelectInFile, 'open-folder': btnSelectInDir, 'convert': btnConvert }[action];
    button.click();
});

btnCopyLog.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(logArea.innerText || '');
        flashCopied(btnCopyLog);
    } catch (e) {
        log('Failed to copy logs to clipboard.', 'error');
    }
});

btnClearLog.addEventListener('click', () => {
    logArea.replaceChildren();
});

btnClearHistory.addEventListener('click', async () => {
    const count = loadHistory().length;
    if (count === 0) return;
    // Every entry goes at once and there is no getting one back, so ask. The
    // native sheet is the plugin's `message` command, which `dialog:default`
    // already grants.
    try {
        const ok = await confirm(
            `Remove ${count === 1 ? 'the 1 entry' : `all ${count} entries`} from the history? This cannot be undone.`,
            { title: 'Clear History', kind: 'warning', okLabel: 'Clear', cancelLabel: 'Cancel' },
        );
        if (!ok) return;
    } catch (e) {
        log(`Could not ask before clearing the history: ${e}`, 'error');
        return;
    }
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
        const textToCopy = `App Version: ${info.app_version}\nConverter Version: ${info.converter_version} (${schemas})`;
        versionsText = textToCopy;
        btnCopyVersion.hidden = false;
        btnCopyVersion.onclick = async () => {
            try {
                await navigator.clipboard.writeText(textToCopy);
                flashCopied(btnCopyVersion);
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
