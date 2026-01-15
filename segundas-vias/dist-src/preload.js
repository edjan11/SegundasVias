// @ts-nocheck
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
    getConfig: () => ipcRenderer.invoke('app:get-config'),
    pickOutputDir: () => ipcRenderer.invoke('app:set-output-dir'),
    pickJsonDir: () => ipcRenderer.invoke('app:set-json-dir'),
    pickXmlDir: () => ipcRenderer.invoke('app:set-xml-dir'),
    saveFile: (payload) => ipcRenderer.invoke('app:save-file', payload),
    saveJson: (payload) => ipcRenderer.invoke('app:save-json', payload),
    saveXml: (payload) => ipcRenderer.invoke('app:save-xml', payload),
    setAlwaysOnTop: (flag) => ipcRenderer.invoke('app:set-always-on-top', flag),
    openOutputDir: () => ipcRenderer.invoke('app:open-output-dir'),
    openJsonDir: () => ipcRenderer.invoke('app:open-json-dir'),
    openXmlDir: () => ipcRenderer.invoke('app:open-xml-dir'),
    dbSaveDraft: (payload) => ipcRenderer.invoke('db:save-draft', payload),
    dbIngest: (payload) => ipcRenderer.invoke('db:ingest', payload),
    dbList: (payload) => ipcRenderer.invoke('db:list', payload),
    dbGet: (id) => ipcRenderer.invoke('db:get', id),
    dbUpdateStatus: (payload) => ipcRenderer.invoke('db:update-status', payload)
});
