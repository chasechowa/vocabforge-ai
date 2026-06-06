import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  invokeApiCall: (url, options) => ipcRenderer.invoke('api-call', url, options),
});
