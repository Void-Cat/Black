/* global $, config, swapper, globalShortcut, BrowserWindow, Audio, alert, close, teaseSlave */

function shrink (arr) {
  let retarr = []
  arr.forEach((val) => {
    if (val !== undefined) retarr.push(val)
  })
  return retarr
}

function clean (arr, deleteValue) {
  let mod = 0
  arr.forEach((val, i) => {
    if (arr[i - mod] === deleteValue) {
      arr.splice(i - mod, 1)
      mod++
    }
  })
  shrink(arr)
  return arr
}

const fs = require('fs')
const url = require('url')
const path = require('path')
const Mousetrap = require('mousetrap')

function getPictures (path, recursive) {
  console.debug('<tease.js / getPictures> Function called with arguments: ', {path: path, recursive: recursive})
  recursive = recursive || false
  let rtv = []
  if (typeof path !== 'string') {
    console.error('Path is not defined!')
  }
  let files = fs.readdirSync(path)
  if (files.length > 0) {
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

  // Trim categories
  Object.keys(categories).forEach((cat) => {
    if (categories[cat].amount < 1) delete categories[cat]
  })
  console.debug('Trimmed categories to:', categories)

  // Read directory files
  let pictures = getPictures(picturePath, true)
  let cards = getPictures(cardPath, true)
  raw.pictures = pictures
  raw.cards = {}

  Object.keys(categories).forEach((cat) => {
    raw.cards[cat] = []
    cards.forEach((c) => {
      if (c.toLowerCase().indexOf(categories[cat].name.toLowerCase()) !== -1) {
        raw.cards[cat].push(c)
      }
    })
    // Trim categories again
    if (raw.cards[cat].length <= 0) {
      delete raw.cards[cat]
      delete categories[cat]
    }
  })

  // Double check any double cards (expirimental)
  var mfd = []
  Object.keys(raw.cards).forEach((cat) => {
    let catname = categories[cat].name.toLowerCase()
    raw.cards[cat].forEach((check, i) => {
      check = check.toLowerCase()
      Object.keys(raw.cards).forEach((cat1) => {
        let cat1name = categories[cat1].name.toLowerCase()
        if (cat1 !== cat) {
          if (check.lastIndexOf(cat1name) !== -1) {
            if (check.indexOf('\\' + cat1name + '\\') !== -1) {
              mfd.push(cat + ':::' + i)
            } else if (check.lastIndexOf(cat1name) > check.lastIndexOf(catname)) {
              mfd.push(cat + ':::' + i)
            } else if (check.split(catname).length <= 2 && check.indexOf('\\' + catname + '\\') === -1) {
              mfd.push(cat + ':::' + i)
            }
          }
        }
      })
    })
  })
  let mft = {}
  mfd.forEach((tp) => {
    mft[tp.split(':::')[0]] = 0
  })
  mfd.forEach((td) => {
    let tdp = td.split(':::')
    delete raw.cards[tdp[0]][tdp[1] - mft[tdp[0]]]
    mft[tdp[0]]++
    raw.cards[tdp[0]] = shrink(raw.cards[tdp[0]])
  })

  // Get the ratio of pictures to cards
  let pictureAmount = config.get('teaseParams.pictureAmount')
  let gameCards = 1
  let eM = {}
  Object.keys(categories).forEach((gcKey) => {
    gameCards += categories[gcKey].amount
    eM[gcKey] = categories[gcKey].amount
    // console.debug('<tease.js / generateFileList> Going through amounts for eM, on categorie:', gcKey, 'amount is', categories[gcKey].amount, 'eM is now', eM)
  })
  // console.debug(eM)
  let ratio = (pictureAmount + gameCards) / gameCards
  ratio = [ratio, ratio]
  gameCards--
  let oL = {}
  Object.keys(raw.cards).forEach((key) => {
    oL[key] = raw.cards[key].length
  })
  oL['pictures'] = raw.pictures.length
  // Get Schwifty
  console.debug('<tease.js / generateFileList> Going into swifty mode with the following data:', {eM: eM, raw: raw, ratio: ratio, gameCards: gameCards, oL: oL, icl: icl})
  for (var n = 0; n < (pictureAmount + gameCards); n++) {
    if (n + 1 > ratio[0] && n !== 0 && Object.keys(raw.cards).length > 0) {
      ratio[0] += ratio[1]
      let pcat = Object.keys(raw.cards)[Math.floor(Math.random() * Object.keys(raw.cards).length)]
      // console.debug('Selected categorie', pcat, 'is:', categories[pcat])
      if (oL[pcat] < categories[pcat].amount) {
        fin.push(raw.cards[pcat][Math.floor(Math.random() * raw.cards[pcat].length)])
      } else {
        fin.push(raw.cards[pcat].splice(Math.floor(Math.random() * raw.cards[pcat].length), 1)[0])
      }
      eM[pcat]--
      if (eM[pcat] === 0) {
        delete raw.cards[pcat]
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
  fin = clean(fin, undefined)
  fin.forEach((r, i) => {
    // console.debug('<tease.js / generateFileList> Fin replace with r:', r, 'and i:', i)
    if (r !== undefined) fin[i] = r.replace(/\\/g, '\\\\')
  })
  dfd.resolve([fin, icl])
  return dfd.promise()
}

function findCTIS (fileList) {
  console.debug('<tease.js / findCTIS> Function called with \'fileList\' argument as: ', fileList)
  let cfd = $.Deferred()
  let ctis = {}
  fileList.forEach((file, i) => {
    if (file === undefined) {
      cfd.reject('Ran into undefined file name at index', i, 'of filelist', fileList)
    } else {
      let b = file.split('.')
      b[b.length - 1] = 'ctis'
      b = b.join('.')
      if (fs.existsSync(b)) {
        ctis[i] = b
      }
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
  this.devTools = globalShortcut.register('CommandOrControl+Shift+Y', _ => {
    this.window.webContents.toggleDevTools()
  })
  this.window.webContents.executeJavaScript('var teaseSlave = new TeaseSlave(config.get(\'teaseslave\'))')
  if (teaseParams.timing.ticker === undefined) teaseParams.timing.ticker = true
  this.window.once('ready-to-show', _ => {
    this.window.show()
  })
  this.window.on('close', _ => {
    globalShortcut.unregister('CommandOrControl+Shift+Y')
    swapper.swap('teaseend')
  })
}

function TeaseSlave (options) {
  // Important Information
  this.fileList = options.fileList
  this.ctisList = options.ctisList
  this.icl = options.icl
  this.ctisCards = []
  Object.keys(this.ctisList).forEach((ccard) => {
    // console.debug('<tease.js / TeaseSlave> Reading CTIS card: ', JSON.parse(fs.readFileSync(this.ctisList[ccard], {encoding: 'utf8'})))
    this.ctisCards[ccard] = new CTISCard(JSON.parse(fs.readFileSync(this.ctisList[ccard], {encoding: 'utf8'})), parseInt(ccard, 10), this.fileList[ccard])
  })
  this.teaseParams = options.teaseParams
  this.ctc = false
  this.onStart = []

  // Slide Control
  this.slideControl = {
    core: {
      backup: null,
      current: -1,
      strokes: 10,
      time: this.teaseParams.timing.slideTime * 1000,
      pause: false,
      run: this.teaseParams.timing.slideTime * 1000,
      ticker: {
        play: _ => {
          if (this.slideControl.core.ticker.muted !== true) {
            this.slideControl.core.ticker.robin[0].play()
            this.slideControl.core.ticker.robin.push(this.slideControl.core.ticker.robin.shift())
          }
        },
        robin: [new Audio(this.teaseParams.timing.tickersrc || '../audio/ticker.ogg')],
        init: _ => {
          for (var n = 0; n < 5; n++) {
            this.slideControl.core.ticker.robin.push(this.slideControl.core.ticker.robin[0].cloneNode())
          }
        },
        volume: (v) => {
          this.slideControl.core.ticker.robin.forEach((audio) => {
            audio.volume = v
          })
        }
      },
      announce: {
        picture: new Audio('../audio/slidechange.ogg'),
        card: new Audio('../audio/card.ogg')
      }
    },
    next: _ => {
      this.slideControl.core.current++
      console.debug('<tease.js / TeaseSlave> New current:', this.slideControl.core.current)
      this.slideControl.set(this.slideControl.core.current)
    },
    previous: _ => {
      if (this.slideControl.core.current > 0) {
        this.slideControl.core.current--
        console.debug('<tease.js / TeaseSlave> Previous called current will be:', this.slideControl.core.current)
        this.slideControl.set(this.slideControl.core.current)
      }
    },
    set: (slide) => {
      if (typeof slide !== 'number') slide = parseInt(slide, 10)
      if (isNaN(slide)) console.error('<tease.js / TeaseSlave / SlideControl>\nSet called but slide value is NaN, namely:', slide)
      if (this.slideControl.core.current !== slide) this.slideControl.core.current = slide
      clearTimeout(this.slideControl.core.backup)
      if (slide >= this.fileList.length) this.exit('end')
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
        this.slideControl.core.ticker.volume(1)
      } else {
        this.slideControl.core.pause = true
        this.slideControl.core.ticker.volume(0)
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
      if ((this.teaseParams.timing.announce === 'card' || this.teaseParams.timing.announce === 'picture' || this.teaseParams.timing.announce === 'both') && this.slideControl.core.run === 0) {
        if (this.icl[this.slideControl.core.current] !== undefined && (this.teaseParams.timing.announce === 'card' || this.teaseParams.timing.announce === 'both')) {
          this.slideControl.core.announce.card.play()
        } else if (this.icl[this.slideControl.core.current] === undefined && (this.teaseParams.timing.announce === 'picture' || this.teaseParams.timing.announce === 'both')) {
          this.slideControl.core.announce.picture.play()
        } else {
          this.slideControl.core.ticker.play()
        }
      } else {
        this.slideControl.core.ticker.play()
      }
    },
    interval: {
      run: null,
      ticker: null
    },
    ignore: (type) => {
      let times = 1
      if (type.indexOf('*') !== -1) {
        times = parseInt(type.split('*')[1], 10)
        type = type.split('*')[0]
      }
      let gi = []
      this.icl.forEach((ctype, index) => {
        if (index > this.slideControl.core.current && (ctype.toLowerCase() === type.toLowerCase() || ctype.toLowerCase() === 'any') && times > 0) {
          gi.push(index)
          times--
        }
      })
      if (gi.length > 0) {
        gi.forEach((idx) => {
          this.ctisList[idx].actions = [new CTISAction({start: 'draw', delay: -1, type: 'contact', fors: 'instant', action: 'yellow:You are to ignore this card.', until: 'instant', index: idx})]
        })
      }
    },
    heraut: (slide, ev) => {
      let p = {}
      if (this.icl[slide] === undefined) {
        p.type = 'picture'
      } else {
        p.type = 'instruction:' + this.icl[slide]
      }
      if (ev !== undefined) p.type = ev
      p.index = slide
      this.actionControl.run(p)
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
      if (coreboy === 'time' && (modifier !== '*' && modifier !== '/')) factor *= 1000
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
        this.slideControl.core[coreboy] = Math.floor(this.slideControl.core[coreboy] / factor)
      } else {
        console.error('<tease.js / TeaseSlave> Adjust called with unrecognizable modifier:', modifier)
        return false
      }
      if (coreboy === 'time' && this.slideControl.core.time < 1) {
        this.slideControl.core.time = 1
        console.warn('<tease.js / TeaseSlave / slideControl>\nAdjust defaulted to 1 on time, can\'t be lower.')
      } else if (coreboy === 'strokes' && this.slideControl.core.strokes < 0) {
        this.slideControl.core.strokes = 0
        console.warn('<tease.js / TeaseSlave / slideControl>\nAdjust defaulted to 0 on strokes, can\'t be lower.')
      }
      $('#' + timer + 'Display').trigger('change')
    },
    addInstruction: (id, instruction) => {
      $('<div class="mdc-typography--body1 ctisinstruction" id="ins-' + id + '">' + instruction + '</div>').insertAfter('#instructionHead')
    },
    removeInstruction: (id) => {
      $('#ins-' + id).remove()
    },
    position: (id, position) => {
      $('#position').attr('pos', id)
      $('#position').text(position)
    },
    ctcUpdate: _ => {
      $('#edge-button, #full-button, #ruin-button').removeClass('mdc-button--accent')
      if (this.ctc === 'full') $('#full-button').addClass('mdc-button--accent')
      if (this.ctc === 'edge') $('#edge-button').addClass('mdc-button--accent')
      if (this.ctc === 'ruin') $('#ruin-button').addClass('mdc-button--accent')
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
      if (typeof item === 'number') {
        if (this.itemControl.keys - item >= 0) {
          for (var i = 0; i < item; i++) {
            this.itemControl.useKey('')
          }
        }
      } else {
        if (this.itemControl.keys > 0) {
          this.itemControl.remove(item)
          if (item === 'Chastity') this.itemControl.chastity(false)
          this.itemControl.keys--
          $('#keyDisplay').text('Keys: ' + this.itemControl.keys)
          if (this.itemControl.keys <= 0) $('#keyDisplay').prop('disabled', true)
        }
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
      if ((this.ctc === 'ruin' && type === 'full') || (this.ctc === 'edge' && (type === 'ruin' || type === 'full')) || ((this.ctc === false || this.ctc === 'false') && type !== 'edge')) {
        this.contact('You came without Mistress\'s permission, and she\'s displeased with you.', 'red')
        this.subControl.mood.bad()
        if (this.subControl.core.sublevel > -5) this.subControl.core.sublevel--
        this.cumControl.nonAllowed++
      } else {
        if (this.subControl.core.sublevel < 5 && type !== 'edge') this.subControl.core.sublevel++
      }
      this.slideControl.heraut(this.slideControl.core.current, 'cum:' + type)
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
        this.subControl.mood.update()
      },
      bad: _ => {
        if (this.subControl.core.mood === 'neutral') this.subControl.core.mood = 'bad'
        if (this.subControl.core.mood === 'good') this.subControl.core.mood = 'neutral'
        this.subControl.mood.update()
      },
      update: _ => {
        if (this.subControl.core.mood === 'good') $('#moodDisplay').text('thumb_up')
        if (this.subControl.core.mood === 'neutral') $('#moodDisplay').text('thumbs_up_down')
        if (this.subControl.core.mood === 'bad') $('#moodDisplay').text('thumb_down')
      }
    },
    get: (val) => {
      if (val === 'mood') return this.subControl.core.mood
      if (val === 'sublevel') return this.subControl.core.sublevel
    }
  }

  this.init = _ => {
    let start = []
    Object.keys(this.ctisCards).forEach((key, i) => {
      let card = this.ctisCards[key]
      card.instruction.actions.forEach((instruction, index) => {
        if (instruction.start === 'start') start.push(card.instruction.actions.splice(index, 1)[0])
      })
    })
    if (start.length > 0) {
      start.forEach((instruction) => {
        this.onStart.push(new CTISAction({start: instruction.start, delay: instruction.delay, type: instruction.type, fors: instruction.fors, conditional: instruction.conditional, action: instruction.action, until: instruction.until, clean: instruction.clean, after: instruction.after, index: 0}))
      })
      this.onStart.forEach((action) => {
        this.actionControl.add(action)
      })
    }
    this.slideControl.core.ticker.init()
    this.slideControl.core.ticker.muted = !this.teaseParams.timing.ticker
    this.ctisCards.forEach((ccard) => {
      ccard.init()
    })
    this.slideControl.interval.run = setInterval(this.slideControl.run, 500)
    this.slideControl.next()
  }

  this.preInit = _ => {
    let names = []
    Object.keys(this.ctisCards).forEach((key, i) => {
      let card = this.ctisCards[key]
      card.instruction.actions.forEach((instruction, index) => {
        if (instruction.start === 'start') names.push(card.name)
      })
    })
    return names
  }

  this.exit = (type) => {
    if (this.blockExit && type !== 'end') {
      alert('Your Mistress won\'t allow you to leave!')
    } else {
      config.set('stats.lastTease.cumming', {full: this.cumControl.total.full, edge: this.cumControl.total.edge, ruin: this.cumControl.total.ruin, nonAllowed: this.cumControl.nonAllowed})
      let oldtotal = config.get('stats.total.cumming') || {full: 0, edge: 0, ruin: 0, nonAllowed: 0}
      let newtotal = {
        full: oldtotal.full + this.cumControl.total.full,
        edge: oldtotal.edge + this.cumControl.total.edge,
        ruin: oldtotal.ruin + this.cumControl.total.ruin,
        nonAllowed: oldtotal.nonAllowed + this.cumControl.nonAllowed
      }
      config.set('stats.total.cumming', newtotal)
      config.set('stats.teases.total', (config.get('stats.teases.total') || 0) + 1)
      if (type === 'user' && this.allowExit) type = 'card'
      if (type === 'user') config.set('stats.teases.etes', (config.get('stats.teases.etes') || 0) + 1)
      config.set('teaseExit', type)
      if (type === 'end') alert('You\'ve reached the end of the tease. The tease will now close.')
      close()
    }
  }

  this.superMode = {
    active: false,
    music: new Audio('../audio/supermode.ogg'),
    colors: ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'],
    i: 0,
    go: _ => {
      console.debug('<tease.js / TeaseSlave> Go go supermode!')
      this.slideControl.heraut(this.slideControl.core.current, 'supermode:start')
      if (!this.superMode.active) {
        teaseSlave.slideControl.core.ticker.volume(0)
        this.superMode.music.play()
        this.superMode.active = true
        setTimeout(_ => {
          this.superMode.interval = setInterval(_ => {
            $('html').css('background-color', this.superMode.colors[this.superMode.i])
            this.superMode.i++
            if (this.superMode.i === this.superMode.colors.length) this.superMode.i = 0
          }, 1000)
        }, 16500)
        setTimeout(_ => { this.superMode.end() }, 184000)
      }
    },
    end: _ => {
      console.debug('<tease.js / TeaseSlave> End of supermode')
      teaseSlave.slideControl.heraut(teaseSlave.slideControl.core.current, 'supermode:end')
      if (this.superMode.active) {
        this.superMode.active = false
        teaseSlave.slideControl.core.ticker.volume(1)
        clearInterval(this.superMode.interval)
        $('html').css('background-color', 'black')
        this.superMode.music.pause()
        this.superMode.currentTime = 0
      }
    }
  }

  this.contact = (msg, color) => {
    if (color === undefined || (color !== 'red' && color !== 'blue' && color !== 'green' && color !== 'yellow')) color = 'blue'
    let id = 'contact-' + Math.floor(Math.random() * 10000)
    $('#contact').prepend('<div id="' + id + '" class="msgbox msgbox-' + color + ' mdc-typography--body1" style="display: none;">' + msg + '</div>')
    $('#' + id).fadeIn(100)
    setTimeout(_ => { $('#contact > #' + id).fadeOut(100, _ => { $('#contact > #' + id).remove() }) }, 4100)
  }

  this.actionControl = {
    core: {
      active: {},
      priority: {},
      lowPriority: {}
    },
    add: (action) => {
      let idf = Math.floor(Math.random() * 100000)
      while (this.actionControl.core.active[idf] !== undefined) {
        idf++
        if (idf > 100000) idf = 1
      }
      this.actionControl.core.active[idf] = action
      console.debug('<tease.js / TeaseSlave / actionControl>\nAdded action with identifier', idf)
      return idf
    },
    remove: (idf) => {
      if (this.actionControl.core.active[idf] !== undefined) delete this.actionControl.core.active[idf]
      console.debug('<tease.js / TeaseSlave / actionControl>\nRemoved action with identifier', idf)
      return true
    },
    run: (p, idx) => {
      console.debug('<tease.js / TeaseSlave / actionControl>\nRun called with arguments:', {p: p, idx: idx})
      if (idx === undefined) {
        // Card drawing/checking
        if (p.type.split(':')[0] === 'instruction') {
          this.ctisCards.forEach((card) => {
            let check = card.check(p.index)
            if (check !== false) {
              check.forEach((newact) => {
                this.actionControl.add(newact)
              })
            }
          })
        }
        // Priority Handeling
        this.actionControl.core.priority = {}
        Object.keys(this.actionControl.core.active).forEach((idf) => {
          let priority = this.actionControl.core.active[idf].priority
          if (priority !== 'none' && priority.indexOf(':') !== -1) {
            let level = priority.split(':', 1)
            priority = priority.split(':')
            if (priority[1] === 'type') { priority = priority.splice(2).join(':') } else { priority = priority.splice(1).join(':') }
            level = parseInt(level, 10)
            if (priority.toLowerCase() === p.type) {
              if (this.actionControl.core.priority[level] === undefined) this.actionControl.core.priority[level] = []
              this.actionControl.core.priority[level].push(idf)
            }
          }
        })
        if (Object.keys(this.actionControl.core.priority).length > 1) {
          let levels = Object.keys(this.actionControl.core.priority)
          levels.forEach((v, i) => { levels[i] = parseInt(v, 10) })
          levels.sort((a, b) => { return a - b })
          levels.pop()
          levels.forEach((level) => {
            this.actionControl.core.priority[level].forEach((idf) => {
              this.actionControl.core.lowPriority[idf] = this.actionControl.core.active[idf]
              delete this.actionControl.core.active[idf]
              console.log('<tease.js / TeaseSlave / ActionControl>\nIgnoring action', idf, 'because of low priority.')
            })
          })
        }
        // Run Handeling
        Object.keys(this.actionControl.core.active).forEach((idf) => {
          let rv = this.actionControl.core.active[idf].run(p.type, p.index)
          console.log('<tease.js / TeaseSlave / actionControl>\nRun returned', rv, 'on action', idf)
          if (rv === 'remove') {
            let after = this.actionControl.core.active[idf].afterAct()
            if (after !== undefined) {
              after.forEach((a) => {
                let ida = this.actionControl.add(a)
                this.actionControl.run({type: 'firstrun', index: p.index}, ida)
              })
            }
            this.actionControl.remove(idf)
          }
        })
        // Priority backplacing
        Object.keys(this.actionControl.core.lowPriority).forEach((idf) => {
          this.actionControl.core.active[idf] = this.actionControl.core.lowPriority[idf]
        })
        this.actionControl.core.lowPriority = {}
      } else {
        if (this.actionControl.core.active[idx] !== undefined) {
          let rv = this.actionControl.core.active[idx].run(p.type, p.index)
          console.log('<tease.js / TeaseSlave / actionControl>\nRun returned', rv, 'on action', idx)
          if (rv === 'remove') {
            let after = this.actionControl.core.active[idx].afterAct()
            if (after !== undefined) {
              after.forEach((a) => {
                let ida = this.actionControl.add(a)
                this.actionControl.run({type: 'firstrun', index: p.index}, ida)
              })
            }
            this.actionControl.remove(idx)
          }
        } else {
          console.error('<tease.js / TeaseSlave / actionControl>\nCalling on non-existent action', idx)
        }
      }
    }
  }

  // Keyconfig
  this.keyconfig = {
    next: Mousetrap.bind('right', _ => {
      $('#next-button').trigger('click')
      this.slideControl.heraut(this.slideControl.core.current, 'button')
    }),
    previous: Mousetrap.bind('left', _ => {
      $('#previous-button').trigger('click')
      this.slideControl.heraut(this.slideControl.core.current, 'button')
    }),
    add: Mousetrap.bind('up', _ => {
      $('#strokeup-button').trigger('click')
    }),
    sub: Mousetrap.bind('down', _ => {
      $('#strokedown-button').trigger('click')
    }),
    longer: Mousetrap.bind(['=', '+'], _ => {
      $('#timeup-button').trigger('click')
    }),
    shorter: Mousetrap.bind('-', _ => {
      $('#timedown-button').trigger('click')
    }),
    pause: Mousetrap.bind('space', _ => {
      $('#pause-play').trigger('click')
    }),
    items: Mousetrap.bind('i', _ => {
      $('#toggleItems').trigger('click')
    }),
    instructions: Mousetrap.bind('o', _ => {
      $('#toggleInstructions').trigger('click')
    }),
    exit: Mousetrap.bind('esc', _ => {
      $('#exit-button').trigger('click')
    }),
    mute: Mousetrap.bind('m', _ => {
      this.slideControl.core.ticker.muted = !this.slideControl.core.ticker.muted
    })
    /* super: Mousetrap.bind(['ctrl+shift+s', 'command+shift+s'], _ => {
      if (this.superMode.active) {
        this.superMode.end()
      } else {
        this.superMode.go()
      }
    }) */
  }
}

function CTISAction (options) {
  console.debug('<tease.js / CTISAction> Action initialized with parameters:', options)
  if (options.delay === undefined) options.delay = 0
  this.parameters = {
    start: options.start || 'draw',
    delay: parseInt(options.delay, 10),
    type: options.type,
    fors: options.fors,
    conditional: options.conditional,
    action: options.action,
    until: options.until,
    clean: options.clean,
    after: options.after
  }
  this.priority = options.priority || 'none'
  this.counter = 0
  this.index = options.index
  this.until = (type, loc) => {
    // Get times and/or delay
    if (this.parameters.until === undefined) this.parameters.until = 'end'
    let until, times, delay
    if (this.parameters.until.indexOf('*') !== -1 || this.parameters.until.indexOf('+') !== -1) {
      if (this.parameters.until.indexOf('*') !== -1 && this.parameters.until.indexOf('+') !== -1) {
        if (this.parameters.until.indexOf('*') < this.parameters.until.indexOf('+')) {
          delay = parseInt(this.parameters.until.split('+')[1], 10)
          times = parseInt(this.parameters.until.split('+')[0].split('*')[1], 10)
          until = this.parameters.until.toLowerCase().split('*')[0].split(':')
        } else {
          times = parseInt(this.parameters.until.split('*')[1], 10)
          delay = parseInt(this.parameters.until.split('*')[0].split('+')[1], 10)
          until = this.parameters.until.toLowerCase().split('+')[0].split(':')
        }
      } else if (this.parameters.until.indexOf('*') !== -1) {
        times = parseInt(this.parameters.until.split('*')[1], 10)
        until = this.parameters.until.toLowerCase().split('*')[0].split(':')
      } else if (this.parameters.until.indexOf('+') !== -1) {
        delay = parseInt(this.parameters.until.split('+')[1], 10)
        until = this.parameters.until.toLowerCase().split('+')[0].split(':')
      }
    } else {
      until = this.parameters.until.toLowerCase().split(':')
    }
    // Prepare
    if (until[0] === 'type') until = until.splice(1)
    let fire = false
    switch (until[0]) {
      case 'cum':
        if (type[0] === 'cum' && (until[1] === type[1] || until[1] === 'any')) {
          fire = true
        }
        break
      case 'instruction':
        if (type[0] === 'instruction' && (until[1] === type[1] || until[1] === 'any' || (until[1] === 'mistress' && (type[1].indexOf('mistress') !== -1 || type[1].indexOf('master') !== -1)))) {
          fire = true
        }
        break
      case 'any':
        if (type[0] === 'instruction' || type[0] === 'picture') {
          fire = true
        }
        break
      case 'picture':
        if (type[0] === 'picture') {
          fire = true
        }
        break
      case 'instant':
        if (loc !== 'before') fire = true
        break
      case 'delay':
        if (parseInt(until[1], 10) > 1) {
          this.parameters.until = 'type:delay:' + (parseInt(until[1], 10) - 1)
        }
    }
    console.debug('<tease.js / CTISAction> Until after switch, with fire', fire, 'for type', type.join(':'))
    if (fire === true && !(this.parameters.type === 'on' && loc === 'before')) {
      if (typeof times !== 'undefined') {
        if (this.counter < times) {
          if (loc === 'before') this.counter++
          fire = false
        }
      }
      if (typeof delay !== 'undefined') {
        if (typeof times === 'undefined' || this.counter >= times) {
          this.parameters.until = 'type:delay:' + delay
          fire = false
        }
      }
    }
    if (fire) {
      // this.parameters.clean
      if (this.parameters.clean !== undefined && this.parameters.clean !== 'false') {
        if (this.parameters.clean === 'unblockQuit') teaseSlave.blockExit = false
        if (this.parameters.clean === 'disallowQuit') teaseSlave.allowExit = false
        if (this.parameters.clean.indexOf('key:') !== -1) {
          if (teaseSlave.itemControl.keys >= parseInt(this.parameters.clean.split(':')[1], 10)) {
            let n = parseInt(this.parameters.clean.split(':')[2], 10)
            if (n > 0) {
              for (var i = 0; i < n; i++) teaseSlave.itemControl.useKey(n)
            }
          }
        }
        if (this.parameters.clean === 'ctc') {
          teaseSlave.ctc = 'false'
          teaseSlave.slideControl.ctcUpdate()
        }
        if (this.parameters.clean === 'ctc:force') {
          let lastCum = teaseSlave.cumControl.core.cumControl.last.split(':')
          if (parseInt(lastCum[0], 10) > this.index && lastCum[1] === this.parameters.action) {
            let ol = 'came'
            if (lastCum[1] === 'edge') ol = 'edged'
            teaseSlave.contact('You ' + ol + ' in time and Mistress is pleased.', 'green')
            teaseSlave.subControl.mood.good()
          } else {
            let ol = 'cum'
            if (lastCum[1] === 'edge') ol = 'edge'
            teaseSlave.contact('You didn\'t ' + ol + ' in time and Mistress is displeased.', 'red')
            teaseSlave.subControl.mood.bad()
          }
          teaseSlave.ctc = 'false'
          teaseSlave.slideControl.ctcUpdate()
        }
        if (this.parameters.clean === 'chastity') teaseSlave.itemControl.chastity(false)
        if (this.parameters.clean.indexOf('item:') !== -1) teaseSlave.itemControl.remove(this.parameters.clean.split(':')[1])
        if (this.parameters.clean.indexOf('instruction:') !== -1) teaseSlave.slideControl.removeInstruction(parseInt(this.parameters.clean.split(':')[1], 10))
        if (this.parameters.clean.indexOf('position:') !== -1 && this.parameters.clean.split(':')[1] === $('#position').attr('pos')) teaseSlave.slideControl.position(0, 'Free')
      }
      return true
    } else {
      return false
    }
  }
  this.afterAct = _ => {
    if (this.parameters.after !== undefined) {
      let ret = []
      this.parameters.after.forEach((act) => {
        ret.push(new CTISAction({start: act.start, delay: act.delay, type: act.type, fors: act.fors, conditonal: act.conditional, action: act.action, until: act.until, clean: act.clean, after: act.after, index: teaseSlave.slideControl.core.current}))
      })
      // console.debug('<tease.js / CTISAction> After parameter found, returning actions:', ret)
      return ret
    } else { return undefined }
  }
  this.run = (type, slide) => {
    type = type.toLowerCase().split(':')
    if (type[0] === 'type') type = type.splice(1)
    // Drawing too early failsafe
    //   if (this.parameters.start === 'draw' && teaseSlave.slideControl.core.current < this.index) return 'fail'
    // Delay
    if (this.parameters.delay > 0) {
      if (slide >= this.index) {
        if (type.indexOf('instruction') !== -1 || type.indexOf('picture') !== -1) {
          this.parameters.delay--
          return 'delay-counted'
        } else {
          return 'delay-ignored'
        }
      }
      return 'delay-too_early'
    }
    // Until (before)
    if (this.until(type, 'before') && this.parameters.type !== 'on') {
      return 'remove'
    }
    // Conditional
    if (this.parameters.conditional !== undefined && this.parameters.conditional !== 'none') {
      let conditional = this.parameters.conditional.split(':')
      if (conditional[0] === 'mood') {
        if (conditional[1] !== teaseSlave.subControl.core.mood) {
          if (conditional[2] === 'force') {
            return 'remove'
          }
          return 'fail'
        }
      } else if (conditional[0] === 'sublevel') {
        let comparator = this.parameters.conditional.split(':')[1]
        let factor = this.parameters.conditional.split(':')[2]
        if ((comparator === '==' && teaseSlave.subControl.core.sublevel !== parseInt(factor, 10)) ||
           (comparator === '>=' && teaseSlave.subControl.core.sublevel < parseInt(factor, 10)) ||
           (comparator === '<=' && teaseSlave.subControl.core.sublevel > parseInt(factor, 10)) ||
           (comparator === '>' && teaseSlave.subControl.core.sublevel <= parseInt(factor, 10)) ||
           (comparator === '<' && teaseSlave.subControl.core.sublevel >= parseInt(factor, 10)) ||
           (comparator === '!=' && teaseSlave.subControl.core.sublevel === parseInt(factor, 10))) {
          return 'fail'
        }
      }
    }
    // Fors
    let fors = this.parameters.fors.split(':')
    let action = false
    if (fors[0] === 'type') fors = this.parameters.fors.split(':').splice(1)
    switch (fors[0]) {
      case 'any':
        if (type[0] === 'picture' || type[0] === 'instruction') action = true
        break
      case 'instant':
        action = true
        this.parameters.fors = 'never'
        break
      case 'picture':
        if (type[0] === 'picture') action = true
        break
      case 'instruction':
        if (type[0] === 'instruction') {
          if (fors[1] === 'any' || type[1] === fors[1] || (fors[1] === 'mistress' && (type[1].indexOf('mistress') !== -1 || type[1].indexOf('master') !== -1))) action = true
        }
        break
      case 'cum':
        if (type[0] === 'cum') {
          if (fors[1] === 'any' || type[1] === fors[1]) action = true
        }
        break
      case 'key':
        if (type[0] === 'key') action = true
    }
    if (action === true) {
      console.debug('<tease.js / CTISAction>\nAction is qualified, action type:', this.parameters.type, ', action:', this.parameters.action)
      // Action
      if (this.parameters.type === 'strokecount' || this.parameters.type === 'slidetime') {
        if (this.parameters.action.indexOf('sw:') === -1) {
          teaseSlave.slideControl.adjust(this.parameters.type, this.parameters.action)
        } else {
          let types = this.parameters.action.split('sw:')[1].split(',')
          if (this.parameters.memory === undefined) this.parameters.memory = 0
          teaseSlave.slideControl.adjust(this.parameters.type, '=' + types[this.parameters.memory])
          this.parameters.memory++
          if (this.parameters.memory >= types.length) this.parameters.memory = 0
        }
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
          coreboy = Math.floor(parseInt(teaseSlave.parameters.action, 10))
        }
        teaseSlave.slideControl.set(coreboy)
      } else if (this.parameters.type === 'stop') {
        if (this.parameters.action === 'block') {
          if (this.parameters.until === 'end') this.parameters.until = 'instant'
          if (this.parameters.until !== undefined && this.paramters.until !== 'instant') {
            if (this.parameters.clean !== 'false') this.parameters.clean = 'unblockQuit'
          }
          teaseSlave.blockExit = true
        } else if (this.parameters.action === 'allow') {
          teaseSlave.allowExit = true
          if (this.parameters.until !== undefined && this.parameters.until !== 'end' && this.parameters.until !== 'instant') {
            if (this.parameters.clean !== 'false') this.parameters.clean = 'disallowQuit'
          }
        } else {
          // console.debug('<tease.js / CTISAction> Should have quit now:', this.parameters)
          teaseSlave.exit('card')
        }
      } else if (this.parameters.type === 'ctc' || this.parameters.type.split(':')[0] === 'ctc') {
        if (teaseSlave.ctc !== this.parameters.action) teaseSlave.ctc = this.parameters.action
        teaseSlave.slideControl.ctcUpdate()
        if (this.parameters.type.indexOf(':force') !== -1) {
          if (this.parameters.clean !== 'false') this.parameters.clean = 'ctc:force'
        } else {
          if (this.parameters.clean !== 'false') this.parameters.clean = 'ctc'
        }
      } else if (this.parameters.type === 'chastity') {
        if (this.parameters.action === 'false' || this.parameters.action === false) {
          teaseSlave.itemControl.remove('Chastity')
          teaseSlave.itemControl.chastity(false)
        } else {
          if (teaseSlave.itemControl.active.indexOf('Chastity') === -1) teaseSlave.itemControl.add('Chastity')
          teaseSlave.itemControl.chastity(true)
        }
        if (this.parameters.until !== undefined && this.parameters.until !== 'end' && this.parameters.until !== 'instant' && this.parameters.action !== 'false') {
          if (this.parameters.clean !== 'false') this.parameters.clean = 'chastity'
        }
      } else if (this.parameters.type === 'item') {
        let item = this.parameters.action
        if (this.parameters.until !== undefined && this.parameters.until !== 'end' && this.parameters.until !== 'instant') {
          if (this.parameters.clean !== 'false') this.parameters.clean = 'item:' + item
        }
        teaseSlave.itemControl.add(item)
      } else if (this.parameters.type === 'key') {
        let n = 1
        if (typeof parseInt(this.parameters.action, 10) === 'number') n = parseInt(this.parameters.action, 10)
        teaseSlave.itemControl.addKey(n)
        if (this.parameters.until !== undefined && this.parameters.until !== 'end' && this.parameters.until !== 'instant') {
          if (this.parameters.clean !== 'false') this.parameters.clean = 'key:' + teaseSlave.itemControl.keys + ':' + n
        }
      } else if (this.parameters.type === 'instruction') {
        let id = Math.floor(Math.random() * 10000)
        teaseSlave.slideControl.addInstruction(id, this.parameters.action)
        if (this.parameters.until !== undefined && this.parameters.until !== 'end' && this.parameters.until !== 'instant') {
          if (this.parameters.clean !== 'false') this.parameters.clean = 'instruction:' + id
        }
      } else if (this.parameters.type === 'position') {
        let id = Math.floor(Math.random() * 10000)
        teaseSlave.slideControl.position(id, this.parameters.action)
        if (this.parameters.until !== undefined && this.parameters.until !== 'end' && this.parameters.until !== 'instant') {
          if (this.parameters.clean !== 'false') this.parameters.clean = 'position:' + id
        }
      } else if (this.parameters.type === 'contact') {
        let color = this.parameters.action.split(':')[0]
        let message = this.parameters.action.split(':')[1]
        teaseSlave.contact(message, color)
      } else if (this.parameters.type === 'on') {
        if (this.parameters.after === undefined) this.parameters.after = []
        this.parameters.after = this.parameters.after.concat(this.parameters.action)
        return 'remove'
      } else if (this.parameters.type === 'supermode') {
        teaseSlave.superMode.go()
      } else if (this.parameters.type === 'ignore') {
        teaseSlave.slideControl.ignore(this.parameters.action)
      } else if (this.parameters.type === 'mood') {
        if (this.parameters.action === 'good') teaseSlave.subControl.mood.good()
        if (this.parameters.action === 'bad') teaseSlave.subControl.mood.bad()
      } else if (this.parameters.type === 'sublevel') {
        let modifier = this.parameters.action.charAt(0)
        if (modifier === '+') {
          teaseSlave.subControl.core.sublevel += parseInt(this.parameters.action.slice(1), 10)
        } else if (modifier === '-') {
          teaseSlave.subControl.core.sublevel -= parseInt(this.parameters.action.slice(1), 10)
        } else {
          if (!isNaN(parseInt(this.parameters.action, 10))) {
            teaseSlave.subControl.core.sublevel = parseInt(this.parameters.action, 10)
          }
        }
        if (teaseSlave.subControl.core.sublevel > 5) teaseSlave.subControl.core.sublevel = 5
        if (teaseSlave.subControl.core.sublevel < -5) teaseSlave.subControl.core.sublevel = -5
      } else if (this.parameters.type === 'skip') {
        let inverseMove = (this.parameters.action.charAt(0) === '-')
        if (inverseMove) this.parameters.action = this.parameters.action.slice(1)
        let goalType = this.parameters.action.split(':')[1].toLowerCase()
        let times = parseInt(this.parameters.action.split(':')[0], 10)
        let goal
        if (inverseMove) {
          for (var d = teaseSlave.slideControl.core.current - 1; d >= 0; d--) {
            if (teaseSlave.icl[d] !== undefined) {
              if (teaseSlave.icl[d].toLowerCase() === goalType && goal === undefined) {
                if (times > 0) times--
                if (times === 0) goal = d
              }
            }
          }
        } else {
          // console.debug('<tease.js / CTISAction> Checking for', goalType, 'instruction cards')
          for (var u = teaseSlave.slideControl.core.current + 1; u < teaseSlave.fileList.length; u++) {
            // console.debug('<tease.js / CTISAction> checking against', teaseSlave.icl[u], 'where u is', u, 'and times is', times)
            if (teaseSlave.icl[u] !== undefined) {
              if (teaseSlave.icl[u].toLowerCase() === goalType && goal === undefined) {
                if (times > 0) times--
                if (times === 0) goal = u
              }
            }
          }
        }
        if (goal !== undefined) {
          teaseSlave.contact('A card skipped you to slide ' + (goal + 1) + '.', 'green')
          teaseSlave.slideControl.set(goal)
        } else {
          teaseSlave.contact('No applicable ' + goalType + ' card was found.', 'yellow')
        }
      }
    }
    // Until after
    if (this.until(type, 'after')) {
      return 'remove'
    }
    return true
  }
}

function CTISCard (instruction, index, name) {
  console.log('<tease.js / CTISCard>\nCard \'' + name + '\' created for index ' + index + '.')
  this.instruction = instruction
  this.name = name || 'Unknown Name'
  this.index = index
  this.actions = []
  this.check = (slide) => {
    if (slide === this.index) {
      console.debug(`<tease.js / CTISCard>\nCheck called for slide ${slide} with index ${this.index}.\n Returning`, this.actions)
      return this.actions
    } else {
      console.debug(`<tease.js / CTISCard>\nCheck called for slide ${slide} with index ${this.index}.\n Returning`, false)
      return false
    }
  }
  this.init = _ => {
    this.instruction.actions.forEach((act) => {
      if (act.fors !== 'instant') var priority = act.priority + ':' + act.fors
      this.actions.push(new CTISAction({start: act.start, delay: act.delay, type: act.type, fors: act.fors, conditional: act.conditional, action: act.action, until: act.until, clean: act.clean, after: act.after, index: this.index, priority: priority}))
    })
  }
}

module.exports = {generateFileList: generateFileList, findCTIS: findCTIS, TeaseMaster: TeaseMaster, TeaseSlave: TeaseSlave}
