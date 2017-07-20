/** Git gud. Catworks native.js for native-feelin' electron apps. */

const remote = require('electron').remote

document.getElementById('close-btn').addEventListener('click', _ => {
  let window = remote.getCurrentWindow()
  window.close()
})

document.getElementById('max-btn').addEventListener('click', _ => {
  let window = remote.getCurrentWindow()
  if (!window.isMaximized()) {
    window.maximize()
    document.getElementById('max-btn').innerHTML = 'fullscreen_exit'
  } else {
    window.unmaximize()
    document.getElementById('max-btn').innerHTML = 'fullscreen'
  }
})

document.getElementById('min-btn').addEventListener('click', _ => {
  let window = remote.getCurrentWindow()
  window.minimize()
})
