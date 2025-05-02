import { readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { executableDir, homeDir, resourceDir, join, dirname } from '@tauri-apps/api/path';
import { Window } from '@tauri-apps/api/window';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';
import PBKDF2 from 'crypto-js/pbkdf2';
import EncBase64 from 'crypto-js/enc-base64';
import SHA256 from 'crypto-js/sha256';

const saveAsModal = document.getElementById('saveAsModal')!;
const modalClose = document.getElementById('modal-close')!;
const encryptionType = document.getElementById('encryption-type') as HTMLSelectElement;
const encryptionFields = document.getElementById('encryption-fields')!;
const fileBrowser = document.getElementById('file-browser')!;
const directoryInput = document.getElementById('save-directory') as HTMLInputElement;
const fontSizeModal = document.getElementById('fontSizeModal')!;
const fontSizeSlider = document.getElementById('font-size-slider') as HTMLInputElement;
const fontSizeLabel = document.getElementById('font-size-label')!;
const fontSizeClose = document.getElementById('font-size-close')!;
const editor = document.getElementById('editor') as HTMLTextAreaElement;
const encryptionSettingsModal = document.getElementById('encryptionSettingsModal')!;
const encryptionSettingsClose = document.getElementById('encryption-settings-close')!;

type FileContext = {
  fullPath: string;
  encryption: 'none' | 'aes';
  password?: string;
};

let currentFile: FileContext | null = null;
let currentDir: string;
let modalMode: 'save' | 'open' = 'save';


// Font size setting
document.getElementById('font-size')?.addEventListener('click', () => {
  fontSizeModal.classList.remove('hidden');
});

fontSizeClose.addEventListener('click', () => {
  fontSizeModal.classList.add('hidden');
});

fontSizeSlider.addEventListener('input', () => {
  const size = fontSizeSlider.value;
  fontSizeLabel.textContent = size;
  editor.style.fontSize = `${size}px`;
});


// File browser inside save and open box
async function updateFileBrowser(dir: string) {
  // get current directory
  console.log("Updating file browser for:", dir);
  currentDir = dir;
  directoryInput.value = dir;

  // find all files and dir in current dir
  let entries = await readDir(dir);
  console.log("Entries:", entries);
  fileBrowser.innerHTML = '';

  entries = entries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });

  // format entries
  const parentDiv = document.createElement('div');
  parentDiv.textContent = '../';
  parentDiv.classList.add('file-entry');
  parentDiv.style.fontStyle = 'italic';
  parentDiv.style.cursor = 'pointer';
  parentDiv.addEventListener('dblclick', async () => {
    const parent = await dirname(currentDir);
    updateFileBrowser(parent);
  });
  fileBrowser.appendChild(parentDiv);

  for (const entry of entries) {
    const div = document.createElement('div');
    div.textContent = entry.name ?? '(unnamed)';
    div.classList.add('file-entry');
    div.style.cursor = 'pointer';

    if (entry.isDirectory) {
      div.style.fontWeight = 'bold';
      // update to next directory if clicked
      div.addEventListener('dblclick', async () => {
        const newPath = await join(dir, entry.name!);
        updateFileBrowser(newPath);
      });
    } else {
      // update filename to clicked file
      div.addEventListener('click', () => {
        (document.getElementById('save-filename') as HTMLInputElement).value = entry.name!;
      });
      
      // open file when double clicked
      div.addEventListener('dblclick', async () => {
        (document.getElementById('save-filename') as HTMLInputElement).value = entry.name!;
        (document.getElementById('modal-confirm') as HTMLButtonElement).click();
      });
    }

    fileBrowser.appendChild(div);
  }
}

// Save as click
document.getElementById('save-as')?.addEventListener('click', async () => {
  modalMode = 'save';
  saveAsModal.classList.remove('hidden');
  (document.getElementById('modal-confirm') as HTMLButtonElement).textContent = 'Save';

  const startDir = await homeDir();           // start location of user home dir. Update on line 162 aswell
  // const startDir = await executableDir();  // executable dir for exe location. Update on line 162 aswell
  //const startDir = await resourceDir();     // resource dir for debug.          Update on line 162 aswell
  updateFileBrowser(startDir);
  (document.getElementById('save-filename') as HTMLInputElement).value = 'untitled.txt';
});

modalClose.addEventListener('click', () => {
  saveAsModal.classList.add('hidden');
});

encryptionType.addEventListener('change', () => {
  if (encryptionType.value === 'none') {
    encryptionFields.classList.add('hidden');
  } else {
    encryptionFields.classList.remove('hidden');
  }
});

// Save button
document.getElementById('save')?.addEventListener('click', async () => {
  if (!currentFile) {
    document.getElementById('save-as')?.dispatchEvent(new Event('click')); // redirect to save as if no prevouse save cached
    return;
  }

  const content = (document.getElementById('editor') as HTMLTextAreaElement).value;
  await writeTextFile(currentFile.fullPath, content);
  setSaveStatus('saved');
});

// Ctrl + s functionality
window.addEventListener('keydown', async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    document.getElementById('save')?.click();
  }
});

// Open click
document.getElementById('open')?.addEventListener('click', async () => {
  modalMode = 'open';
  saveAsModal.classList.remove('hidden');
  (document.getElementById('modal-confirm') as HTMLButtonElement).textContent = 'Open';

  // const startDir = await resourceDir();
  // const startDir = await executableDir();
  const startDir = await homeDir();
  updateFileBrowser(startDir);
  (document.getElementById('save-filename') as HTMLInputElement).value = '';
});

// Save as and Open boxes
document.getElementById('modal-confirm')?.addEventListener('click', async () => {
  let filename = (document.getElementById('save-filename') as HTMLInputElement).value.trim();
  const encryption = (document.getElementById('encryption-type') as HTMLSelectElement).value as 'none' | 'aes';
  const password = (document.getElementById('password') as HTMLInputElement).value;
  const confirm = (document.getElementById('confirm-password') as HTMLInputElement).value;

  if (encryption !== 'none' && password !== confirm) {
    alert('Passwords do not match.');
    return;
  }

  // add .ennote file enxtension if encrypted
  if(!filename.endsWith('.ennote')) { filename += '.ennote'; }
  const fullPath = await join(currentDir, filename);

  // save functionality
  if (modalMode === 'save') {
    let content = (document.getElementById('editor') as HTMLTextAreaElement).value;

    // encrypt content before saving
    if (encryption !== 'none' && password) {
      const key = deriveKey(password);
      const encrypted = AES.encrypt(content, key).toString();
      content = `ENNOTEv1:${encrypted}`;
    }

    await writeTextFile(fullPath, content);

    // cache file details for future saving
    currentFile = {
      fullPath,
      encryption,
      password: encryption !== 'none' ? password : undefined
    };
    setSaveStatus('saved');
    updateWindowTitle(filename);

    // open functionality
  } else if (modalMode === 'open') {
    try {
      let text = await readTextFile(fullPath);

      if (encryption !== 'none' && password) {
        try {
          // check formatting and load text as decrypted content
          if (!text.startsWith('ENNOTEv1:')) throw new Error('Invalid format');
          const encryptedPart = text.replace('ENNOTEv1:', '');
          const key = deriveKey(password);
          const decrypted = AES.decrypt(encryptedPart, key).toString(Utf8);
          if (!decrypted) throw new Error('Decryption failed');
          text = decrypted;
        } catch (err) {
          alert('Failed to decrypt file. Check your password.');
          return;
        }
      }

      // update editor text
      (document.getElementById('editor') as HTMLTextAreaElement).value = text;

      // cache file details for future saving
      currentFile = {
        fullPath,
        encryption,
        password: encryption !== 'none' ? password : undefined
      };
      setSaveStatus('saved');
      updateWindowTitle(filename);
    } catch (err) {
      console.error(err);
      alert('Failed to open file.');
      return;
    }
  }

  saveAsModal.classList.add('hidden');
});

// Save status circle in upper right corner. Yellow = Unsaved, Green = Saved
function setSaveStatus(status: 'unsaved' | 'saved') {
  const indicator = document.getElementById('save-status')!;
  indicator.style.backgroundColor = status === 'saved' ? 'green' : 'yellow';
}

editor.addEventListener('input', () => {
  setSaveStatus('unsaved');
});


// Set title to include filename
function updateWindowTitle(name: string) {
  Window.getCurrent().setTitle(`${name} - EnNote`);
}

// Hash password before encrypting
function deriveKey(password: string, salt: string = 'ennote_salt'): string {
  return PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 1000
  }).toString();
}

// Encryption setting click.
document.getElementById('encryption')?.addEventListener('click', () => {
  encryptionSettingsModal.classList.remove('hidden');
});

encryptionSettingsClose.addEventListener('click', () => {
  encryptionSettingsModal.classList.add('hidden');
});