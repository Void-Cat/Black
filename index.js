const {app, BrowserWindow, globalShortcut} = require('electron')
const path = require('path')
const url = require('url')
const Config = require('electron-config')
const config = new Config()

let win

function createWindow () {
  let opts = {frame: false, backgroundColor: '#191919', show: false, icon: path.join(__dirname, 'assets/icons/png/64x64.png')}
  Object.assign(opts, config.get('winBounds') || {width: 800, height: 600})
  win = new BrowserWindow(opts)

  win.loadURL(url.format({
    pathname: path.join(__dirname, 'assets', 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  win.once('ready-to-show', _ => {
    win.show()
  })

  win.on('close', _ => {
    config.set('winBounds', win.getBounds())
  })

  win.on('closed', _ => {
    win = null
  })
}

app.on('ready', _ => {
  createWindow()

  globalShortcut.register('CommandOrControl+Shift+C', _ => {
    win.openDevTools()
  })

  globalShortcut.register('CommandOrControl+Shift+R', _ => {
    win.reload()
  })
})

app.on('will-quit', _ => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', _ => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', _ => {
  if (win === null) {
    createWindow()
  }
})
