import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

async function fetchWithProxy(url, options) {
  let proxyUri = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || null;

  if (!proxyUri) {
    try {
      const proxyString = await session.defaultSession.resolveProxy(url);
      console.log(`[fetchWithProxy] resolveProxy("${url}") = "${proxyString}"`);
      if (proxyString && proxyString !== 'DIRECT') {
        const match = proxyString.match(/PROXY\s+([^;\s]+)/);
        if (match) proxyUri = `http://${match[1]}`;
      }
    } catch (e) {
      console.warn('[fetchWithProxy] resolveProxy failed:', e.message);
    }
  }

  if (proxyUri) {
    console.log(`[fetchWithProxy] Trying proxy: ${proxyUri}`);
    try {
      const agent = new HttpsProxyAgent(proxyUri);
      const response = await fetch(url, { ...options, agent });
      return response;
    } catch (proxyErr) {
      console.warn('[fetchWithProxy] Proxy fetch failed, falling back to direct:', proxyErr.message);
    }
  }

  console.log(`[fetchWithProxy] Direct fetch to ${url}`);
  return fetch(url, options);
}
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false,
        },
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}
// IPC handler: proxy HTTP requests from renderer to bypass CORS
// Automatically detects and uses system proxy settings.
ipcMain.handle('api-call', async (_event, url, options) => {
    try {
        const isKimi = url.includes('kimi.com') || url.includes('moonshot.cn');
        const mergedOptions = {
            ...options,
            headers: {
                ...(options?.headers || {}),
                ...(isKimi ? {
                    'User-Agent': 'Kimi-CLI/1.0',
                    'X-Kimi-Client': 'cli',
                } : {}),
            },
        };
        const response = await fetchWithProxy(url, mergedOptions);
        const body = await response.text();
        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body,
        };
    }
    catch (error) {
        console.error('[api-call] fetch error:', error);
        throw new Error(error.message || 'Network request failed');
    }
});
app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
