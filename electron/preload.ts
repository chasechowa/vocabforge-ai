const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invokeApiCall: (url: string, options: any) => ipcRenderer.invoke('api-call', url, options),
});
