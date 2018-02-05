import { app, BrowserWindow, globalShortcut } from 'electron'
import Store from 'electron-store'

let storage = new Store()

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit()
}

if (storage.get('settings.disableHardwareAcceleration') === true) app.disableHardwareAcceleration()

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

const createWindow = () => {
  // Create the browser window.
  let options = {
    backgroundColor: '#191919',
    frame: false,
    icon: `${__dirname}/icons/png/64x64.png`,
    show: false
  }

  mainWindow = new BrowserWindow(Object.assign(options, storage.get('windowBoundaries') || { width: 800, height: 600 }))

  // and load the main.html of the app.
  mainWindow.loadURL(`file://${__dirname}/main.html`)

  // Show the window when ready.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Save the window boundries on close
  mainWindow.on('close', () => {
    storage.set('windowBoundaries', mainWindow.getBounds())
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow()

  // Register globalShortcut for reload and devTools
  globalShortcut.register('CommandOrControl+Shift+C', () => mainWindow.openDevTools())
  globalShortcut.register('CommandOrControl+Shift+R', () => mainWindow.reload())
})

// Code for unregistering globalShortcuts when the app will quits
app.on('will-quit', () => globalShortcut.unregisterAll())

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
