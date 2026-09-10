const { app, BrowserWindow, dialog, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep all Chromium profile data (including localStorage used by the ERP)
// inside the portable ERP folder, not in the user's normal browser profile.
const portableRoot = app.isPackaged
  ? path.dirname(process.execPath)
  : __dirname;
const dataRoot = path.join(portableRoot, 'ERP_DATA');
const backupRoot = path.join(portableRoot, 'BACKUPS');
fs.mkdirSync(dataRoot, { recursive: true });
fs.mkdirSync(backupRoot, { recursive: true });

// Must be set before app ready / session initialization.
app.setPath('userData', dataRoot);
app.setPath('sessionData', path.join(dataRoot, 'Session'));
app.setPath('cache', path.join(dataRoot, 'Cache'));

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'SHABA_COMPUTER_ERP.html'));
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

ipcMain.handle('erp:backup', async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destination = path.join(backupRoot, `ERP_BACKUP_${stamp}`);
  copyDir(dataRoot, destination);
  return destination;
});

ipcMain.handle('erp:open-data-folder', async () => {
  await require('electron').shell.openPath(dataRoot);
  return dataRoot;
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
