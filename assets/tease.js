/* global $, config, swapper, globalShortcut, BrowserWindow, Audio, alert, close, teaseSlave */

function clean (arr, deleteValue) {
  let mod = 0
  arr.forEach((val, i) => {
    if (arr[i - mod] === deleteValue) {
      arr.splice(i, 1)
      mod++
    }
  })
  return arr
}

const fs = require('fs')
const url = require('url')
const path = require('path')

function getPictures (path, recursive) {
  // console.debug('<tease.js / getPictures> Function called with arguments: ', {path: path, recursive: recursive})
  recursive = recursive || false
  let rtv = []
  if (typeof path !== 'string') {
    console.error('Path is not defined!')
  }
  let files = fs.readdirSync(path)
  if (files.length !== 0) {
    files.forEach((f) => {
      let stat = fs.lstatSync(path + '\\' + f)
      if (stat.isDirectory() || stat.isSymbolicLink()) {
        if (recursive && f !== 'deleted') {
          rtv = rtv.concat(getPictures(path + '\\' + f, true))
        }
      } else if (stat.isFile()) {
        if (f.indexOf('.jpg') !== -1 || f.indexOf('.jpeg') !== -1 || f.indexOf('.gif') !== -1 || f.indexOf('.png') !== -1) {
          rtv.push(path + '\\' + f)
        }
      }
    })
  }
  return rtv
}

function generateFileList (picturePath, cardPath, categories) {
  console.debug('<tease.js / generateFileList> Function called with arguments: ', {picturePath: picturePath, cardPath: cardPath, categories: categories})
  // Setup
  var dfd = $.Deferred()
  var raw = {}
  var fin = []
  var icl = {}

  // Catch fail because of arguments.
  if (categories === undefined) {
    dfd.reject('Not enough arguments.')
  }

  // Read directory files
  let pictures
  let cards
  pictures = getPictures(picturePath, true)
  cards = getPictures(cardPath, true)
  raw.pictures = pictures
  raw.cards = {}

  Object.keys(categories).forEach((house) => {
    raw.cards[house] = []
    cards.forEach((c) => {
      if (c.toLowerCase().indexOf(categories[house].name.toLowerCase()) !== -1) {
        raw.cards[house].push(c)
      }
    })
  })

  // Get the ratio of pictures to cards
  let pictureAmount = config.get('teaseParams.pictureAmount')
  let gameCards = 0
  let eM = {}
  Object.keys(categories).forEach((gcKey) => {
    gameCards += categories[gcKey].amount
    if (eM[gcKey] === undefined) { eM[gcKey] = 0 }
    gcKey++
  })
  gameCards += 1
  let ratio = Math.floor(Math.max((pictureAmount / gameCards), (gameCards / pictureAmount)))
  let oL = {}
  Object.keys(raw.cards).forEach((key) => {
    oL[key] = raw.cards[key].length
  })
  oL['pictures'] = raw.pictures.length
  // Get Schwifty
  for (var n = 0; n < (pictureAmount + gameCards); n++) {
    if (n % ratio === 0 && n !== 0) {
      let pcat = Object.keys(raw.cards)[Math.floor(Math.random() * Object.keys(raw.cards).length)]
      if (oL[pcat] < categories[pcat].amount) {
        fin.push(raw.cards[pcat][Math.floor(Math.random() * raw.cards[pcat].length)])
      } else {
        fin.push(raw.cards[pcat].splice(Math.floor(Math.random() * raw.cards[pcat].length), 1)[0])
      }
      eM[pcat]--
      if (eM[pcat] === 0) {
        raw.cards[pcat] = undefined
      }
      icl[fin.length - 1] = categories[pcat].name
    } else {
      if (oL['pictures'] < pictureAmount) {
        fin.push(raw.pictures[Math.floor(Math.random() * raw.pictures.length)])
      } else {
        fin.push(raw.pictures.splice(Math.floor(Math.random() * raw.pictures.length), 1)[0])
      }
    }
  }
  fin = clean(fin)
  fin.forEach((r, i) => {
    // console.debug('<tease.js / generateFileList> Fin replace with r:', r, 'and i:', i)
    if (r !== undefined) fin[i] = r.replace(/\\/g, '\\\\')
  })
  dfd.resolve([fin, icl])
  return dfd.promise()
}

function findCTIS (fileList) {
  // console.debug('<tease.js / findCTIS> Function called with \'fileList\' argument as: ', fileList)
  let cfd = $.Deferred()
  let ctis = {}
  fileList.forEach((file, i) => {
    if (file === undefined) cfd.reject('Ran into undefined file name at index', i, 'of filelist', fileList)
    let b = file.split('.')
    b[b.length - 1] = 'ctis'
    b = b.join('.')
    if (fs.existsSync(b)) {
      ctis[i] = b
    }
  })
  cfd.resolve(ctis)
  return cfd.promise()
}

function TeaseMaster (teaseParams, fileList, ctisList, icl) {
  console.debug('<tease.js / TeaseMaster> Function called with arguments: ', {teaseParams: teaseParams, fileList: fileList, ctisList: ctisList, icl: icl})
  config.set('teaseslave', {teaseParams: teaseParams, fileList: fileList, ctisList: ctisList, icl: icl})
  this.window = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    frame: false,
    backgroundColor: '#000000'
  })
  this.window.loadURL(url.format({
    pathname: path.join(__dirname, 'html', 'tease.html'),
    protocol: 'file:',
    slashes: true
  }))
  console.debug('<tease.js / TeaseMaster> Window URL set to:', `file://${__dirname}/src/html/tease.html`)
  this.window.setFullScreen(true)
  this.keyconfig = {
    mute: globalShortcut.register('CommandOrControl+M', _ => {
      this.window.webContents.setAudioMuted(!this.window.webContents.isAudioMuted())
    }),
    devTools: globalShortcut.register('CommandOrControl+Shift+Y', _ => {
      this.window.webContents.toggleDevTools()
    })
  } // Part of the keyconfig is done by Master: to control the window, and part is done by Slave: to control the Tease.
  this.window.webContents.executeJavaScript('var teaseSlave = new TeaseSlave(config.get(\'teaseslave\'))')
  this.window.webContents.setAudioMuted(!teaseParams.timing.ticker)
  this.window.once('ready-to-show', _ => {
    this.window.show()
  })
  this.window.on('close', _ => {
    globalShortcut.unregister('CommandOrControl+M')
    globalShortcut.unregister('CommandOrControl+Shift+Y')
    globalShortcut.unregister('Right')
    globalShortcut.unregister('Left')
    globalShortcut.unregister('Up')
    globalShortcut.unregister('Down')
    globalShortcut.unregister('=')
    globalShortcut.unregister('-')
    globalShortcut.unregister('Space')
    // Save teasestats, maybe by slave
    swapper.swap('home')
  })
}

function TeaseSlave (options) {
  // Important Information
  this.fileList = options.fileList
  this.ctisList = options.ctisList
  this.icl = options.icl
  this.ctisCards = []
  Object.keys(this.ctisList).forEach((ccard) => {
    console.debug('<tease.js / TeaseSlave> Reading CTIS card: ', JSON.parse(fs.readFileSync(this.ctisList[ccard], {encoding: 'utf8'})))
    this.ctisCards[ccard] = new CTISCard(JSON.parse(fs.readFileSync(this.ctisList[ccard], {encoding: 'utf8'})), parseInt(ccard, 10))
  })
  this.ctisCards.forEach((ccard) => {
    ccard.init()
  })
  this.teaseParams = options.teaseParams
  this.ctc = false

  // Slide Control
  this.slideControl = {
    core: {
      backup: null,
      current: -1,
      strokes: 10,
      time: this.teaseParams.timing.slideTime * 1000,
      pause: false,
      run: this.teaseParams.timing.slideTime * 1000,
      ticker: new Audio('../audio/ticker.ogg')
    },
    next: _ => {
      if (this.slideControl.core.current < this.fileList.length - 1) {
        this.slideControl.core.current++
        console.debug('<tease.js / TeaseSlave> Next called current will be:', this.slideControl.core.current)
        this.slideControl.set(this.slideControl.core.current)
      }
    },
    previous: _ => {
      if (this.slideControl.core.current > 0) {
        this.slideControl.core.current--
        console.debug('<tease.js / TeaseSlave> Previous called current will be:', this.slideControl.core.current)
        this.slideControl.set(this.slideControl.core.current)
      }
    },
    set: (slide) => {
      clearTimeout(this.slideControl.core.backup)
      $('#mainImage').attr('src', this.fileList[slide])
      $('#preload').attr('src', this.fileList[slide + 1])
      clearInterval(this.slideControl.interval.ticker)
      this.slideControl.interval.ticker = setInterval(this.slideControl.ticker, Math.floor(this.slideControl.core.time / this.slideControl.core.strokes))
      this.slideControl.core.run = 0
      $('#mainImage').trigger('change')
      this.slideControl.heraut(slide)
      this.slideControl.core.backup = setTimeout(this.slideControl.ticker(), 500)
    },
    pause: _ => {
      if (this.slideControl.core.pause) {
        this.slideControl.core.pause = false
        this.slideControl.core.ticker.volume = 1
      } else {
        this.slideControl.core.pause = true
        this.slideControl.core.ticker.volume = 0
      }
      $('#pause-play').trigger('change')
    },
    run: _ => {
      if (!this.slideControl.core.pause) {
        if (this.slideControl.core.run >= (this.slideControl.core.time - 500)) {
          this.slideControl.next()
        } else {
          this.slideControl.core.run += 500
        }
      }
    },
    ticker: _ => {
      this.slideControl.core.ticker.play()
    },
    interval: {
      run: null,
      ticker: null
    },
    heraut: (slide) => {
      let p = {}
      if (this.icl[slide] === undefined) {
        p.type = 'picture'
      } else {
        p.type = 'instruction:' + this.icl[slide]
      }
      p.index = slide
      let rv = []
      this.ctisCards.forEach((f, i) => {
        if (f.update(p) === 'remove') {
          rv.push(i)
        }
      })
      let transform = 0
      rv.forEach((i) => {
        this.ctisCards.splice(i - transform, 1)
        transform++
      })
    },
    adjust: (timer, adjustment) => {
      let coreboy
      if (timer.toLowerCase() === 'slidetime' || timer.toLowerCase() === 'time') {
        coreboy = 'time'
        timer = 'slideTime'
      } else if (timer.toLowerCase() === 'strokecount' || timer.toLowerCase() === 'strokes') {
        coreboy = 'strokes'
        timer = 'strokeCount'
      }
      let modifier = adjustment.charAt(0)
      if (parseInt(adjustment.charAt(0), 10)) {
        modifier = '='
        adjustment = '=' + adjustment
      }
      let factor = parseInt(adjustment.slice(1), 10)
      if (coreboy === 'time') factor *= 1000
      console.debug('<tease.js / TeaseSlave> Adjust called currently timer is:', timer + ',', 'modifier is:', modifier, 'and adjustment is:', adjustment)
      if (isNaN(factor)) return false
      if (modifier === '+') {
        this.slideControl.core[coreboy] += factor
      } else if (modifier === '-') {
        this.slideControl.core[coreboy] -= factor
      } else if (modifier === '*') {
        this.slideControl.core[coreboy] *= factor
      } else if (modifier === '=') {
        this.slideControl.core[coreboy] = factor
      } else if (modifier === '/') {
        this.slideControl.core[coreboy] = Math.floor(this.slideControl.core[timer] / factor)
      } else {
        console.error('<tease.js / TeaseSlave> Adjust called with unrecognizable modifier:', modifier)
        return false
      }
      $('#' + timer + 'Display').trigger('change')
    }
  }

  this.itemControl = {
    active: [],
    keys: 0,
    add: (name) => {
      this.itemControl.active.push(name.toLowerCase())
      $('#itemlist').prepend('<div class="ctisitem" name="' + name + '" onclick="$(\'#keyDisplay\').trigger(\'unlock\', \'' + name + '\')">' + name.charAt(0).toUpperCase() + name.slice(1) + '</div>')
    },
    remove: (name) => {
      this.itemControl.active.splice(this.itemControl.active.indexOf(name.toLowerCase()), 1)
      $($('#itemlist > .ctisitem[name="' + name + '"]')[0]).remove()
    },
    useKey: (item) => {
      if (this.itemControl.keys > 0) {
        this.itemControl.remove(item)
        if (item === 'Chastity') this.itemControl.chastity(false)
        this.itemControl.keys--
        $('#keyDisplay').text('Keys: ' + this.itemControl.keys)
        if (this.itemControl.keys <= 0) $('#keyDisplay').prop('disabled', true)
      }
    },
    addKey: (n) => {
      n = n || 1
      this.itemControl.keys += n
      if (this.itemControl.keys < 0) this.itemControl.keys = 0
      $('#keyDisplay').text('Keys: ' + this.itemControl.keys)
      if ($('#keyDisplay').is(':disabled')) $('#keyDisplay').prop('disabled', false)
    },
    chastity: (bool) => {
      console.debug('<tease.js / TeaseSlave> ItemControl>Chastity Called. With argument \'bool\' being:', bool)
      if (bool === true || bool === undefined) {
        $('#chastityDisplay').fadeIn(100)
      } else if (bool === false) {
        $('#chastityDisplay').fadeOut(100)
      }
    }
  }

  this.cumControl = {
    last: undefined,
    total: {
      full: 0,
      edge: 0,
      ruin: 0
    },
    nonAllowed: 0,
    update: (type) => {
      if (type !== 'full' && type !== 'edge' && type !== 'ruin') type = 'full'
      this.cumControl.last = this.slideControl.core.current + ':' + type
      this.cumControl.total[type]++
      if ((this.ctc === 'ruin' && type === 'full') || (this.ctc === 'edge' && (type === 'ruin' || type === 'full')) || (this.ctc === false || this.ctc === 'false')) {
        this.contact('You\'ve cum without Mistress\'s permission, and she\'s displeased with you.', 'red')
        this.subControl.mood.bad()
        if (this.subControl.core.sublevel > -5) this.subControl.core.sublevel--
        this.cumControl.nonAllowed++
      } else {
        if (this.subControl.core.sublevel < 5) this.subControl.core.sublevel++
      }
    }
  }

  this.subControl = {
    core: {
      sublevel: config.get('profile.sublevel') || 0,
      mood: 'neutral'
    },
    mood: {
      good: _ => {
        if (this.subControl.core.mood === 'neutral') this.subControl.core.mood = 'good'
        if (this.subControl.core.mood === 'bad') this.subControl.core.mood = 'neutral'
        this.subControl.core.mood.update()
      },
      bad: _ => {
        if (this.subControl.core.mood === 'neutral') this.subControl.core.mood = 'bad'
        if (this.subControl.core.mood === 'good') this.subControl.core.mood = 'neutral'
        this.subControl.core.mood.update()
      },
      update: _ => {
        if (this.subControl.core.mood === 'good') $('#moodDisplay').text('thumbs_up')
        if (this.subControl.core.mood === 'neutral') $('#moodDisplay').text('thumbs_up_down')
        if (this.subControl.core.mood === 'bad') $('#moodDisplay').text('thumbs_down')
      }
    }
  }

  this.init = _ => {
    this.slideControl.interval.run = setInterval(this.slideControl.run, 500)
    this.slideControl.next()
  }

  this.exit = (isEnd) => {
    if (this.blockExit) {
      alert('Your Mistress won\'t allow you to leave!')
    } else {
      config.set('stats.lastTease.cumming', {full: this.cumControl.total.full, edge: this.cumControl.total.edge, ruin: this.cumControl.total.ruin, nonAllowed: this.cumControl.nonAllowed})
      let oldtotal = config.get('stats.total.cumming')
      let newtotal = {
        full: oldtotal.full + this.cumControl.total.full,
        edge: oldtotal.edge + this.cumControl.total.edge,
        ruin: oldtotal.ruin + this.cumControl.total.ruin,
        nonAllowed: (oldtotal.nonAllowed || 0) + this.cumControl.total.ruin
      }
      config.set('stats.total.cumming', newtotal)
      config.set('stats.teases.total', (config.get('stats.teases.total') || 0) + 1)
      if (!isEnd) config.set('stats.teases.etes', (config.get('stats.teases.etes') || 0) + 1)
      close()
    }
  }

  this.contact = (msg, color) => {
    if (color === undefined || (color !== 'red' && color !== 'blue' && color !== 'green')) color = 'blue'
    let id = 'contact-' + Math.floor(Math.random() * 10000)
    $('contact').prepend('<div id="' + id + '" class="msgbox msgbox-' + color + ' mdc-typography--body1" style="display: none;">' + msg + '</div>')
    $('#' + id).fadeIn(100)
    setTimeout($('#main > #' + id).fadeOut(100, _ => { $('contact > #' + id).remove() }), 4100)
  }

  // Keyconfig
  this.keyconfig = {
    next: globalShortcut.register('Right', _ => {
      $('#next-button').trigger('click')
    }),
    previous: globalShortcut.register('Left', _ => {
      $('#previous-button').trigger('click')
    }),
    add: globalShortcut.register('Up', _ => {
      $('#strokeup-button').trigger('click')
    }),
    sub: globalShortcut.register('Down', _ => {
      $('#strokedown-button').trigger('click')
    }),
    longer: globalShortcut.register('=', _ => {
      $('#timeup-button').trigger('click')
    }),
    shorter: globalShortcut.register('-', _ => {
      $('#timedown-button').trigger('click')
    }),
    pause: globalShortcut.register('Space', _ => {
      $('#pause-play').trigger('click')
    }),
    exit: globalShortcut.register('Esc', _ => {
      $('#exit-button').trigger('click')
    })
  }
}

function CTISAction (start, type, fors, conditional, action, until, index) {
  console.debug('<tease.js / CTISAction> Action initialized with parameters:', {start: start, type: type, fors: fors, conditional: conditional, action: action, until: until, index: index})
  this.parameters = {
    start: start || 'draw',
    type: type,
    fors: fors,
    conditional: conditional,
    action: action,
    until: until
  }
  this.counter = 0
  this.index = index
  this.drawn = false
  this.start = this.parameters.start === 'start' || false
  this.draw = _ => {
    this.drawn = true
    if (this.parameters.start !== 'start') this.start = true
  }
  this.until = (type, boa) => {
    if (this.parameters.until === undefined) this.parameters.until = 'instant'
    let until = this.parameters.until.split('*')[0]
    let times = this.parameters.until.split('*')[1] || undefined
    let fire = false
    type = type.split(':')
    console.debug('<tease.js / CTISAction> until is called with until:', until, ', and type:', type)
    if (until === 'instant' && boa !== 'before') return true
    if (teaseSlave.slideControl.core.current === this.index) return false
    until = until.split(':')
    if (until[1] === type[0]) {
      if (until[1] === 'instruction' && until[2] === 'any') {
        fire = true
      } else if (until[2] === times[1]) {
        fire = true
      } else if ([until[1], until[2]].join(':') === type.join(':')) {
        fire = true
      }
    }
    if (fire) {
      if (times !== undefined) {
        if (parseInt(times, 10) === this.counter + 1) return true
        this.counter++
        return false
      }
      return true
    }
    return false
  }
  this.run = (type, slide) => {
    if (this.start === true) {
      if (this.until(type, 'before')) {
        if (this.parameters.untilAct === 'unblockQuit') teaseSlave.blockExit = false
        this.start = false
        return 'remove'
      }
      if (this.parameters.conditional !== undefined && this.parameters.conditional !== 'none') {
        let conditional = this.parameters.conditional.split(':')
        if (conditional[0] === 'mood') {
          if (conditional[1] !== teaseSlave.subControl.get('mood')) {
            if (conditional[2] === 'force') {
              return 'remove'
            }
            return 'fail'
          }
        } else if (conditional[0] === 'sublevel') {
          // let comparator = this.parameters.conditional.split(':')
        }
      }
      if (this.parameters.fors.split(':')[1] === 'any' || this.parameters.fors === 'instant' || (this.parameters.fors.split(':')[1] === 'picture' && type === 'picture') || (this.parameters.fors.split(':')[1] === 'instruction' && (this.parameters.split(':')[2] === 'any' || this.parameters.split(':')[2] === type.split(':')[1]))) {
        console.debug('<tease.js / CTISAction> Action is qualified, action type:', this.parameters.type, ', action:', this.parameters.action)
        if (this.parameters.type === 'strokecount' || this.parameters.type === 'slidetime') {
          teaseSlave.slideControl.adjust(this.parameters.type, this.parameters.action)
        } else if (this.parameters.type === 'setslide') {
          let modifier = this.parameters.action.split('', 1)
          let coreboy = slide
          if (modifier === '+') {
            coreboy += parseInt(this.parameters.action.replace('+', ''), 10)
          } else if (modifier === '-') {
            coreboy -= parseInt(this.parameters.action.replace('-', ''), 10)
          } else if (modifier === '*') {
            coreboy = coreboy * parseInt(this.parameters.action.replace('*', ''))
          } else if (modifier === '/') {
            coreboy = Math.floor(coreboy / parseInt(this.parameters.action.replace('/', '')))
          } else {
            coreboy = Math.floor(parseInt(teaseSlave.slideControl.core.action, 10))
          }
          teaseSlave.slideControl.set(coreboy)
        } else if (this.parameters.type === 'stop') {
          if (this.parameters.action === 'block') {
            if (this.parameters.until === 'end') this.parameters.until = 'instant'
            if (this.parameters.until !== undefined && this.paramters.until !== 'instant') {
              this.parameters.untilAct = 'unblockQuit'
            }
            teaseSlave.blockExit = true
          } else {
            teaseSlave.exit()
          }
        } else if (this.parameters.type === 'ctc' || this.parameters.type.split(':')[0] === 'ctc') {
          if (teaseSlave.ctc !== this.parameters.action) teaseSlave.ctc = this.parameters.action
          if (this.parameters.type.indexOf(':force') !== -1) {
            this.parameters.untilAct = 'ctc:force'
          } else {
            this.parameters.untilAct = 'ctc'
          }
        } else if (this.parameters.type === 'chastity') {
          if (this.parameters.action === 'false' || this.parameters.action === false) {
            teaseSlave.itemControl.remove('Chastity')
            teaseSlave.itemControl.chastity(false)
          } else {
            if (teaseSlave.itemControl.active.indexOf('Chastity') === -1) teaseSlave.itemControl.add('Chastity')
            teaseSlave.itemControl.chastity(true)
          }
          if (this.parameters.until !== undefined && this.parameters.until !== 'end') this.parameters.untilAct = 'chastity'
        } else if (this.parameters.type === 'item') {
          let item = this.parameters.action
          if (until !== undefined && until !== 'end') this.parameters.untilAct = 'item:' + item
          teaseSlave.itemControl.add(item)
        } else if (this.parameters.type === 'key') {
          let n = 1
          if (typeof parseInt(this.parameters.action, 10) === 'number') n = parseInt(this.parameters.action, 10)
          teaseSlave.itemControl.addKey(n)
        }
      }
      if (this.until(type, 'after')) {
        if (this.parameters.untilAct === 'unblockQuit') teaseSlave.blockExit = false
        if (this.parameters.untilAct === 'ctc') teaseSlave.ctc = 'false'
        if (this.parameters.untilAct === 'ctc:force') {
          let lastCum = teaseSlave.cumControl.core.cumControl.last.split(':')
          if (parseInt(lastCum[0], 10) > this.index && lastCum[1] === this.parameters.action) {
            teaseSlave.subControl.good()
          } else {
            teaseSlave.subControl.bad()
          }
          teaseSlave.ctc = 'false'
        }
        if (this.parameters.untilAct === 'chastity') teaseSlave.slideControl.chastity
        return 'remove'
      }
      this.first = true
      return true
    }
  }
}

function CTISCard (instruction, index) {
  console.debug('<tease.js / CTISCard> Card initialized. With parameters:', {instruction: instruction, index: index})
  this.instruction = instruction
  this.index = index
  this.actions = []
  this.update = (p) => {
    if (this.actions.length > 0) {
      if (p.index === this.index) {
        this.actions.forEach((action) => {
          console.debug('<tease.js / CTISCard> Card drawn, notifying action:', action)
          action.draw()
        })
      }
      let rv = []
      this.actions.forEach((action, i) => {
        rv.push(action.run(p.type, p.index))
      })
      rv.forEach((rval, i) => {
        if (rval === 'remove') {
          this.actions.splice(i, 1)
        }
      })
      if (this.actions.length <= 0) {
        return 'remove'
      } else {
        return true
      }
    } else {
      return 'remove'
    }
  }
  this.init = _ => {
    this.instruction.actions.forEach((act) => {
      this.actions.push(new CTISAction(act.start, act.type, act.fors, act.conditional, act.action, act.until, this.index))
    })
  }
}

module.exports = {generateFileList: generateFileList, findCTIS: findCTIS, TeaseMaster: TeaseMaster, TeaseSlave: TeaseSlave}
