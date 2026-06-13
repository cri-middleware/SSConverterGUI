import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="header">
    <h1>SSConverter GUI</h1>
    <p>Convert SpriteStudio project (.sspj) to binaries (.ssab)</p>
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

    <div class="form-group drop-zone" id="dropZoneOut" style="margin-top: 1rem;">
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

    <div class="status-area">
      <div class="status-item">
        <span class="status-title">Status</span>
        <span class="status-badge badge-pending" id="convertStatus">Waiting</span>
      </div>
    </div>
    
    <button class="btn btn-success btn-full" id="btnConvert" disabled>
      ⚡ Convert
    </button>
    
    <div style="margin-top: 2rem;">
      <span style="color: var(--text-muted); font-weight: 600;">History</span>
      <div id="historyArea" style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem;"></div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; margin-bottom: -1rem;">
      <span style="color: var(--text-muted); font-weight: 600;">Logs</span>
      <button class="btn" id="btnClearLog" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; background: rgba(239, 68, 68, 0.2); color: #f87171;">Clear Logs</button>
    </div>
    <div class="log-area" id="logArea"></div>
  </div>
`;

interface HistoryItem {
    inputPath: string;
    outputPath: string | null;
    embedded: boolean;
    timestamp: number;
}

const btnSelectInFile = document.getElementById('btnSelectInFile') as HTMLButtonElement;
const btnSelectInDir = document.getElementById('btnSelectInDir') as HTMLButtonElement;
const btnSelectOut = document.getElementById('btnSelectOut') as HTMLButtonElement;
const btnClearOut = document.getElementById('btnClearOut') as HTMLButtonElement;
const btnConvert = document.getElementById('btnConvert') as HTMLButtonElement;
const btnClearLog = document.getElementById('btnClearLog') as HTMLButtonElement;
const inDirDisplay = document.getElementById('inDirDisplay') as HTMLInputElement;
const outDirDisplay = document.getElementById('outDirDisplay') as HTMLInputElement;
const convertStatus = document.getElementById('convertStatus')!;
const logArea = document.getElementById('logArea')!;
const historyArea = document.getElementById('historyArea')!;
const chkEmbedded = document.getElementById('chkEmbedded') as HTMLInputElement;

let selectedPath: string | null = null;
let selectedOutPath: string | null = null;

function log(msg: string, type: 'info' | 'error' | 'success' = 'info') {
    const div = document.createElement('div');
    div.textContent = msg;
    if (type !== 'info') {
        div.className = `log-${type}`;
    }
    logArea.appendChild(div);
    logArea.scrollTop = logArea.scrollHeight;
}

function updateBadge(el: HTMLElement, text: string, type: 'pending' | 'active' | 'success' | 'error') {
    el.textContent = text;
    el.className = `status-badge badge-${type}`;
}

function saveHistory(item: HistoryItem) {
    let history: HistoryItem[] = JSON.parse(localStorage.getItem('convert_history') || '[]');
    history = history.filter(h => h.inputPath !== item.inputPath);
    history.unshift(item);
    if (history.length > 5) history.pop();
    localStorage.setItem('convert_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history: HistoryItem[] = JSON.parse(localStorage.getItem('convert_history') || '[]');
    historyArea.innerHTML = '';
    if (history.length === 0) {
        historyArea.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem;">No history yet.</div>';
        return;
    }
    
    history.forEach(item => {
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.9rem;';
        
        const pathLabel = item.inputPath.length > 40 ? '...' + item.inputPath.slice(-37) : item.inputPath;
        
        div.innerHTML = `
            <div style="display: flex; flex-direction: column; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <span style="font-weight: 500; color: var(--text-primary);" title="${item.inputPath}">${pathLabel}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted);">Out: ${item.outputPath || 'Default'} | Emb: ${item.embedded ? 'Yes' : 'No'}</span>
            </div>
            <button class="btn btn-history-retry" style="padding: 0.4rem 0.75rem; font-size: 0.85rem; background: var(--primary-color); color: white;">Load</button>
        `;
        
        const btn = div.querySelector('button')!;
        btn.addEventListener('click', () => {
            selectedPath = item.inputPath;
            inDirDisplay.value = selectedPath;
            selectedOutPath = item.outputPath;
            outDirDisplay.value = selectedOutPath || '';
            chkEmbedded.checked = item.embedded;
            btnConvert.disabled = false;
            log(`Loaded from history: ${selectedPath}`);
        });
        
        historyArea.appendChild(div);
    });
}

// Tauri v2 drag-drop intercept
listen<{ paths: string[] }>('tauri://file-drop', event => {
    if (event.payload.paths && event.payload.paths.length > 0) {
        const path = event.payload.paths[0];
        if (path.endsWith('.sspj') || !path.includes('.')) {
            selectedPath = path;
            inDirDisplay.value = selectedPath;
            btnConvert.disabled = false;
            log(`Dropped Input: ${selectedPath}`);
        } else {
            log(`Dropped file is not .sspj or a folder: ${path}`, 'error');
        }
    }
});

// Also listen to tauri://drag-drop just in case (different v2 plugin events)
listen<{ paths: string[] }>('tauri://drag-drop', event => {
    if (event.payload.paths && event.payload.paths.length > 0) {
        const path = event.payload.paths[0];
        if (path.endsWith('.sspj') || !path.includes('.')) {
            selectedPath = path;
            inDirDisplay.value = selectedPath;
            btnConvert.disabled = false;
            log(`Dropped Input: ${selectedPath}`);
        }
    }
});

// Listen to converter logs from the backend
listen<string>('convert-log', event => {
    log(event.payload);
});

btnSelectInFile.addEventListener('click', async () => {
    try {
        const file = await open({
            multiple: false,
            directory: false,
            filters: [{ name: 'SpriteStudio Project', extensions: ['sspj'] }]
        });
        if (file) {
            selectedPath = file as string;
            inDirDisplay.value = selectedPath;
            btnConvert.disabled = false;
            log(`Selected Input File: ${selectedPath}`);
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
            selectedPath = dir as string;
            inDirDisplay.value = selectedPath;
            btnConvert.disabled = false;
            log(`Selected Input Folder: ${selectedPath}`);
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
            log(`Selected Output: ${selectedOutPath}`);
        }
    } catch (e: any) {
        log(`Error: ${e.message || e}`, 'error');
    }
});

btnClearOut.addEventListener('click', () => {
    selectedOutPath = null;
    outDirDisplay.value = '';
    log('Cleared output directory. Will use default location.');
});

btnConvert.addEventListener('click', async () => {
    if (!selectedPath) return;
    
    try {
        btnConvert.disabled = true;
        btnSelectInFile.disabled = true;
        btnSelectInDir.disabled = true;
        
        updateBadge(convertStatus, 'Converting...', 'active');
        log('Starting conversion natively...');
        
        const startTime = performance.now();
        const result = await invoke('convert_sspj', {
            inputPath: selectedPath,
            outputPath: selectedOutPath,
            embedded: chkEmbedded.checked
        });
        const endTime = performance.now();
        log(`Conversion completed in ${(endTime - startTime).toFixed(2)} ms.`, 'success');
        
        updateBadge(convertStatus, 'Success', 'success');
        log(result as string, 'success');
        
        saveHistory({
            inputPath: selectedPath,
            outputPath: selectedOutPath,
            embedded: chkEmbedded.checked,
            timestamp: Date.now()
        });
    } catch (e: any) {
        log(`Error: ${e}`, 'error');
        updateBadge(convertStatus, 'Failed', 'error');
    } finally {
        btnConvert.disabled = false;
        btnSelectInFile.disabled = false;
        btnSelectInDir.disabled = false;
    }
});

btnClearLog.addEventListener('click', () => {
    logArea.textContent = '';
});

// Initial render
renderHistory();
