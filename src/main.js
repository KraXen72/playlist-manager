// Modules to control application life and create native browser window
const { app, BrowserWindow, protocol, ipcMain } = require('electron')
const path = require('path')
const remoteMain = require('@electron/remote/main')

remoteMain.initialize()

// In-memory image store
const imageStore = new Map()

// Must be called before app.whenReady()
protocol.registerSchemesAsPrivileged([{
  scheme: 'mem',
  privileges: { secure: true, supportFetchAPI: true, bypassCSP: true }
}])

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 900,
    minHeight: 490,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'playlist-manager.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  remoteMain.enable(mainWindow.webContents)

  // and load the index.html of the app.
  mainWindow.loadFile('src/index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  protocol.handle('mem', (request) => {
    const id = new URL(request.url).hostname
    const entry = imageStore.get(id)
    if (!entry) return new Response(null, { status: 404 })
    return new Response(entry.data, {
      headers: { 'Content-Type': entry.mime }
    })
  })

  ipcMain.on('store-image', (event, { id, data, mime }) => {
    imageStore.set(id, { data: Buffer.from(data), mime })
  })

  ipcMain.on('free-image', (event, id) => {
    imageStore.delete(id)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
