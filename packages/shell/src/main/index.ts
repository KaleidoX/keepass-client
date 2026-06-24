import { BrowserWindow, app } from 'electron';
import path from 'node:path';

async function createWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, '../preload/index.js')
    }
  });

  await window.loadURL(process.env.ELECTRON_RENDERER_URL ?? 'http://127.0.0.1:5173');
}

app.whenReady().then(createWindow);
