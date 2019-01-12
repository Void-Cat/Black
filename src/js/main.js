import './js/catworks/native.js'
import * as mdc from 'material-components-web/dist/material-components-web'
import Store from 'electron-store'
import Swapper from './js/catworks/swapper.js'
import Theme from './js/catworks/themer.js'
//import Designer from './js/designer.js'

const $ = require('jquery')
const {app, BrowserWindow, dialog, globalShortcut, shell} = require('electron').remote
const fs = require('fs')

const currentVersion = app.getVersion()

// function TestDesigner(options) {
//   var des = new Designer('#swapper', options || {})
// }

var storage = new Store()

var theme = new Theme({
    active: storage.get('theme.index'),
    path: './themes/',
    themelist: (storage.get('theme.lightmode') === true ? [
        'red',
        'blue',
        'green',
        'yellow',
        'purple',
        'black'
    ] : [
        'red.dark',
        'blue.dark',
        'green.dark',
        'yellow.dark',
        'purple.dark',
        'black.dark'
    ])
})
theme.setTheme(storage.get('theme.index') || 0)
if (theme.active < 0 || theme.active >= theme.themelist.length) theme.setTheme(0)

var swapper = new Swapper('swapper', './html/')
swapper.start('continue', 'home')
swapper.onswap((loc) => {
    if (loc === 'teaseend')
    theme.setTheme(storage.get('theme.index'))
    drawer.open = false;
})

var drawer = new mdc.drawer.MDCDrawer(document.querySelector('.mdc-drawer'))
$('#menu-btn').click(() => {
    drawer.open = true;
})
$('aside.mdc-drawer--modal').find('a.mdc-list-item').click(() => {
    drawer.open = false;
})

$('#theme-btn').click(() => {
    if (theme.active === theme.themelist.length - 1) theme.setTheme(0)
    else theme.setTheme(theme.active + 1)
})
