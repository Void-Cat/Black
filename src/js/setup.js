/* global $, mdc, dialog, storage, generateFileList, findCTIS, TeaseMaster */
var tease

function updateSuggestion (type) {
  if (type === 'all') {
    updateSuggestion('cards')
    updateSuggestion('pictures')
    return true
  }
  let cardTotal = 0
  let pictureTotal = storage.get('teaseParams.pictureAmount') || 0
  let ratio = storage.get('settings.cardratio') || 10
  Object.keys(storage.get('teaseParams.categories')).forEach((cat) => {
    cardTotal += storage.get('teaseParams.categories.' + cat + '.amount')
  })
  if (type === 'cards') {
    let suggestion = Math.ceil(cardTotal / ratio * 100) - cardTotal
    $('#suggestion-picture').text(suggestion)
    $('#suggestion-total').text(cardTotal)
    updateSuggestion('time')
    return true
  } else if (type === 'pictures') {
    let suggestion = Math.ceil(pictureTotal / (100 - ratio) * 100) - pictureTotal
    $('#suggestion-card').text(suggestion)
    updateSuggestion('time')
    return true
  } else if (type === 'time') {
    let suggestion = Math.ceil((cardTotal + pictureTotal) * (parseInt(storage.get('teaseParams.timing.slideTime'), 10) / 60))
    $('#suggestion-time').text(suggestion)
    return true
  } else {
    return false
  }
}

function tCategory (id, name, amount) {
  return '<div id="' + id + '" class="cardCategory mdc-list-item" style="display: flex;"><div style="width: 60%; display: flex;"><div class="mdc-text-field" style="display: inline-block; margin: 0; flex: 1;"><input type="text" class="mdc-text-field__input" placeholder="Name/Folder" value="' + name + '" /></div></div>&nbsp;&nbsp;<div class="mdc-text-field" style="flex: 1; margin-bottom: 0;"><input type="number" min="0" class="mdc-text-field__input" placeholder="Amount" value="' + amount + '" /></div>&nbsp;&nbsp;<i class="material-icons" style="display: inline-block; vertical-align: sub; cursor: pointer;">remove_circle_outline</i></div>'
}

function newCategory (name, amount, ee) {
  // console.log('[setup.html / newCategory()] Call Received with parameters: ', [name, amount, ee])
  let id
  if (ee === undefined) {
    id = 'cc' + $('div.cardCategory').length
    let cycle = $('div.cardCategory').length
    while ($('#' + id).length > 0) {
      cycle++
      id = 'cc' + cycle
    }
  } else {
    id = ee
  }
  $('#categorylist').append(tCategory(id, name || '', amount || 0))
  let newcat = $('#' + id)
  $(newcat).find('input').on('change', (ed) => {
    let category = $(ed.target).parents('.cardCategory').attr('id')
    storage.set('teaseParams.categories.' + category, {
      name: $('#' + category).find('input[type="text"]').val() === '' ? undefined : $('#' + category).find('input[type="text"]').val(),
      amount: parseInt($('#' + category).find('input[type="number"]').val(), 10) || 0
    })
    updateSuggestion('cards')
  })
  $(newcat).find('i.material-icons').click((ed) => {
    let category = $(ed.target).parents('.cardCategory').attr('id')
    storage.set('teaseParams.categories.' + category, undefined)
    $('#' + category).slideUp(100, _ => { $('#' + category).remove() })
    updateSuggestion('cards')
  })
}

$('#cardCategoriesClear').click(_ => {
  $('#categorylist').find('i.material-icons').trigger('click')
})

$('#cardCategoriesReset').click(_ => {
  $('#cardCategoriesClear').trigger('click')
  let defaultlist = [
    'Bondage',
    'Chance to Cum',
    'Chastity Belt',
    'Delusional',
    'Dilemma',
    'Edge',
    'Getting Into Character',
    'Humiliation',
    'Key',
    'Nice Mistress',
    'Rough Mistress',
    'Special',
    'Stroke It',
    'Time Lapse',
    'Work It'
  ]
  for (var i = 0; i < defaultlist.length; i++) {
    newCategory(defaultlist[i])
  }
  $('#categorylist').find('input[type="text"]').trigger('change')
})

var tickerSelect = new mdc.select.MDCSelect($('#ticker-sound')[0])
var sortTypeSelect = new mdc.select.MDCSelect($('#sort-type')[0])
var sortNotSelect = new mdc.select.MDCSelect($('#sort-not')[0])

if (storage.get('teaseParams.loadSetup')) {
  $('#saveSetup').prop('checked', true)
  $('#browseCardsLabel').text(storage.get('teaseParams.cardFolder'))
  $('#browseCardsLabel').fadeIn(100)
  $('#browsePicturesLabel').text(storage.get('teaseParams.pictureFolder'))
  $('#browsePicturesLabel').fadeIn(100)
  $('#pictureAmount').val(storage.get('teaseParams.pictureAmount'))
  let categories = storage.get('teaseParams.categories')
  for (var i = 0; i < Object.keys(categories).length; i++) {
    let key = Object.keys(categories)[i]
    newCategory(categories[key].name, categories[key].amount, key)
  }
  $('#slideTime').val(storage.get('teaseParams.timing.slideTime'))
  $('#enableTicker').prop('checked', storage.get('teaseParams.timing.ticker'))
  if (storage.get('teaseParams.timing.announce') === 'card' || storage.get('teaseParams.timing.announce') === 'both') {
    $('#announce-card').prop('checked', true)
  }
  if (storage.get('teaseParams.timing.announce') === 'picture' || storage.get('teaseParams.timing.announce') === 'both') {
    $('#announce-picture').prop('checked', true)
  }
  if (storage.get('teaseParams.timing.tickersrc') === undefined) storage.set('teaseParams.timing.tickersrc', `atom:///${__dirname}/../audio/ticker.ogg`)
  tickerSelect.selectedIndex = storage.get('teaseParams.timing.tickersrc').indexOf('ticker.ogg') >= 0 ? 0 : 1
  if (storage.get('teaseParams.order') === undefined) storage.set('teaseParams.order', {enabled: false, type: 'filename', not: 'random'})
  $('#sort-do').prop('checked', storage.get('teaseParams.order.enabled') || false)
  sortTypeSelect.selectedIndex = storage.get('teaseParams.order.type').indexOf('filename') >= 0 ? 0 : 1
  let sortNot = storage.get('teaseParams.order.not')
  if (sortNot === 'random') sortNotSelect.selectedIndex = 0
  if (sortNot === 'end') sortNotSelect.selectedIndex = 1
  if (sortNot === 'omit') sortNotSelect.selectedIndex = 2
}

$('#saveSetup').on('change', _ => {
  if ($('#saveSetup').is(':checked')) {
    storage.set('teaseParams.loadSetup', true)
  } else {
    storage.set('teaseParams.loadSetup', false)
  }
})
$('#browseCardsBtn').click(_ => {
  dialog.showOpenDialog({
    title: 'Select Cards Folder',
    properties: ['openDirectory']
  }, (path) => {
    storage.set('teaseParams.cardFolder', path)
    if (path === '' || path === undefined) {
      $('#browseCardsLabel').fadeOut(100)
    } else {
      $('#browseCardsLabel').text(path)
      $('#browseCardsLabel').fadeIn(100)
    }
  })
})
$('#browsePicturesBtn').click(_ => {
  dialog.showOpenDialog({
    title: 'Select Picture Folder',
    properties: ['openDirectory']
  }, (path) => {
    storage.set('teaseParams.pictureFolder', path)
    if (path === '' || path === undefined) {
      $('#browsePictures').fadeOut(100)
    } else {
      $('#browsePicturesLabel').text(path)
      $('#browsePicturesLabel').fadeIn(100)
    }
  })
})
$('#pictureAmount').on('change', _ => {
  if ($('#pictureAmount').val() === '') {
    $('#pictureAmount').val(0)
  } else {
    storage.set('teaseParams.pictureAmount', parseInt($('#pictureAmount').val(), 10))
  }
  updateSuggestion('pictures')
})

$('#slideTime').on('change', _ => {
  let newtime = $('#slideTime').val()
  if (newtime === '' || newtime < 0) {
    $('#slideTime').val(0)
    storage.set('teaseParams.timing.slideTime', 0)
  } else {
    storage.set('teaseParams.timing.slideTime', newtime)
  }
  updateSuggestion('time')
})
$('#enableTicker').click(_ => {
  storage.set('teaseParams.timing.ticker', $('#enableTicker').is(':checked'))
})

$('#announce-card, #announce-picture').click(_ => {
  let card = $('#announce-card').is(':checked')
  let picture = $('#announce-picture').is(':checked')
  if (card && picture) {
    storage.set('teaseParams.timing.announce', 'both')
  } else if (card) {
    storage.set('teaseParams.timing.announce', 'card')
  } else if (picture) {
    storage.set('teaseParams.timing.announce', 'picture')
  } else {
    storage.set('teaseParams.timing.announce', undefined)
  }
})

tickerSelect.listen('MDCSelect:change', _ => {
  if (tickerSelect.selectedIndex === 1) {
    storage.set('teaseParams.timing.tickersrc', `atom:///${__dirname}/audio/metronome.ogg`)
  } else {
    storage.set('teaseParams.timing.tickersrc', `atom:///${__dirname}/audio/ticker.ogg`)
  }
})

$('#sort-do').on('change', _ => {
  storage.set('teaseParams.order.enabled', $('#sort-do').is(':checked'))
})

sortTypeSelect.listen('MDCSelect:change', _ => {
  if (sortTypeSelect.selectedIndex === 1) {
    storage.set('teaseParams.order.type', 'property')
  } else {
    storage.set('teaseParams.order.type', 'filename')
  }
})

sortNotSelect.listen('MDCSelect:change', _ => {
  if (sortNotSelect.selectedIndex === 1) {
    storage.set('teaseParams.order.not', 'end')
  } else if (sortNotSelect.selectedIndex === 2) {
    storage.set('teaseParams.order.not', 'omit')
  } else {
    storage.set('teaseParams.order.not', 'random')
  }
})

$('#startTease').click(_ => {
  var genProgress = mdc.linearProgress.MDCLinearProgress.attachTo($('#genProgress')[0])
  $('#popover').fadeIn(100, _ => {
    $.when(generateFileList(storage.get('teaseParams.pictureFolder')[0], storage.get('teaseParams.cardFolder')[0], storage.get('teaseParams.categories'))).then((ret) => {
      let fileList = ret[0]
      let icl = ret[1]
      console.debug('<setup.html / [#startTease]> We got a filelist!')
      $('#newTease-1').css('color', 'lime')
      $('#newTease-2').slideDown(100)
      $.when(findCTIS(fileList)).then((ctisList) => {
        console.debug('<setup.html / [#startTease]> We got a ctisList!')
        tease = new TeaseMaster(storage.get('teaseParams'), fileList, ctisList, icl)
        $('#newTease-0, #newTease-2').slideUp(100)
        $('#newTease-1').slideDown(100)
        genProgress.foundation_.setReverse(false)
        if (tease) {}
      }, (err) => {
        if (err !== undefined) { console.error(err) }
      })
    }, (err) => {
      if (err !== undefined) { console.error(err) }
    })
  })
})

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

function getPictures (path, recursive) {
  recursive = recursive || false
  let rtv = []
  if (typeof path !== 'string') {
    console.error('Path is not defined!')
    return false
  }
  let files = fs.readdirSync(path)
  if (files.length > 0) {
    files.forEach((f) => {
      let stat = fs.lstatSync(path + '/' + f)
      if (stat.isDirectory() || stat.isSymbolicLink()) {
        if (recursive && f !== 'deleted') {
          rtv = rtv.concat(getPictures(path + '/' + f, true))
        }
      } else if (stat.isFile()) {
        if (f.indexOf('.jpg') !== -1 || f.indexOf('.jpeg') !== -1 || f.indexOf('.gif') !== -1 || f.indexOf('.png') !== -1) {
          rtv.push(path + '/' + f)
        }
      }
    })
  }
  return rtv
}

function generateFileList (picturePath, cardPath, categories) {
  console.debug('<tease.js / generateFileList>\nFunction called with arguments: ', {picturePath: picturePath, cardPath: cardPath, categories: categories})
  // Setup
  var dfd = $.Deferred()
  var raw = {}
  var fin = []
  var icl = {}
  var order = storage.get('teaseParams.order') || {enabled: false}

  // Catch fail because of arguments.
  if (typeof categories === 'undefined') {
    dfd.reject('Not enough arguments.')
  }

  // Trim categories
  Object.keys(categories).forEach((cat) => {
    if (categories[cat].amount < 1) delete categories[cat]
  })

  // Read directory files
  let pictures = getPictures(picturePath, true)
  let cards = getPictures(cardPath, true)
  raw.pictures = pictures
  raw.cards = {}

  let ditched = []
  // Sort categories
  Object.keys(categories).forEach((cat) => {
    raw.cards[cat] = []
    cards.forEach((c) => {
      if (c.toLowerCase().indexOf(categories[cat].name.toLowerCase()) !== -1) {
        raw.cards[cat].push(c)
      }
    })
    // Trim categories again
    if (raw.cards[cat].length <= 0) {
      ditched.push(categories[cat].name)
      delete raw.cards[cat]
      delete categories[cat]
    }
  })
  storage.set('teaseParams.ditched', ditched)

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
            if (check.indexOf('/' + cat1name + '/') !== -1) {
              mfd.push(cat + ':::' + i)
            } else if (check.lastIndexOf(cat1name) > check.lastIndexOf(catname)) {
              mfd.push(cat + ':::' + i)
            } else if (check.split(catname).length <= 2 && check.indexOf('/' + catname + '/') === -1) {
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

  // Order cards
  let biglist = []
  let trimBiglist = {}
  if (order.enabled === true) {
    console.debug('<tease.js / generateFileList>\nEntered order section.')
    // Populate biglist
    Object.keys(raw.cards).forEach((key) => {
      raw.cards[key].forEach((card) => {
        biglist.push(key + ':=:' + card)
      })
    })
    Object.keys(categories).forEach((cat) => {
      trimBiglist[cat] = categories[cat].amount
    })
    // Sort by filename
    if (order.type === 'filename') {
      let dl = []
      biglist.forEach((name, i) => {
        let na = []
        name.split('.').forEach((f) => { if (!isNaN(parseInt(f, 10))) na.push(parseInt(f, 10)) })
        if (na.length > 1) na = na[na.length - 1]
        if (na.length <= 0 || na < 0) dl.push(i)
      })
      dl.sort().reverse()
      dl.forEach((i) => {
        delete biglist[i]
      })
      console.debug('<tease.js / generateFileList>\n' + dl.length, 'cards were found unsortable:\n', dl)
      biglist.sort((a, b) => {
        let aa = []
        let ba = []
        a.split('.').forEach((f) => { if (!isNaN(parseInt(f, 10))) aa.push(parseInt(f, 10)) })
        b.split('.').forEach((f) => { if (!isNaN(parseInt(f, 10))) ba.push(parseInt(f, 10)) })
        aa = aa[aa.length - 1]
        ba = ba[ba.length - 1]
        return aa - ba
      })
      if (order.not === 'random') {
        dl.forEach((d) => {
          biglist.splice(Math.floor(Math.random() * biglist.length), 0, d)
        })
      } else if (order.not === 'end') {
        let lower = biglist.length - 1
        dl.forEach((d) => {
          let space = biglist.length - lower
          biglist.splice(lower + Math.floor(Math.random() * space + 1), 0, d)
        })
      }
    } else if (order.type === 'property') {
      // Sort by ORDER property
      console.debug('<tease.js / generateFileList>\nEntered order-property section.')
      let dl = []
      let sort = {}
      biglist.forEach((card, i) => {
        let path = card.split(':=:')[1].split('.').splice(0, card.split(':=:')[1].split('.').length - 1).concat('ctis').join('.')
        console.debug('<tease.js / generateFileList>\nChecking order info on path', path)
        if (fs.existsSync(path)) {
          try {
            let json = JSON.parse(fs.readFileSync(path), {encoding: 'utf8'})
            if (isNaN(json.order)) {
              dl.push(card)
            } else {
              if (sort[json.order] === undefined) sort[json.order] = []
              sort[json.order].push(card)
            }
          } catch (e) {
            console.warn('We had a run in with a faulty .ctis card:\n', path, '\nThe complete error is as follows:\n', e)
          }
        }
      })
      biglist = []
      Object.keys(sort).forEach((key) => {
        while (sort[key].length > 0) {
          let pick = Math.floor(Math.random() * sort[key].length)
          console.debug('<tease.js / TeaseParams>\nPushing card ' + sort[key][pick] + ' to biglist.')
          biglist.push(sort[key][pick])
          sort[key].splice(pick, 1)
        }
      })
      if (order.not === 'random') {
        dl.forEach((d) => {
          biglist.splice(Math.floor(Math.random() * biglist.length), 0, d)
        })
      } else if (order.not === 'end') {
        let lower = biglist.length - 1
        dl.forEach((d) => {
          let space = biglist.length - lower
          biglist.splice(lower + Math.floor(Math.random() * space + 1), 0, d)
        })
      }
    }
    // Trim biglist
    console.debug('<tease.js / generateFileList>\nGoing into biglist trimming with:', {trimBiglist: trimBiglist})
    let ga = {}
    Object.keys(trimBiglist).forEach((cat) => {
      let amount = trimBiglist[cat]
      let trim = []
      biglist.forEach((card, i) => {
        let cardcat = card.split(':=:')[0]
        if (cardcat === cat) {
          if (amount > 0) {
            amount--
          } else {
            trim.push(i)
            amount--
          }
        }
      })
      ga[cat] = amount
      trim.sort().reverse()
      trim.forEach((i) => {
        biglist.splice(i, 1)
      })
    })
    console.debug('<tease.js / generateFileList>\nCards sorted and trimmed.\n', ga)
  }

  // Get the ratio of pictures to cards
  let pictureAmount = storage.get('teaseParams.pictureAmount')
  let gameCards = 1
  let eM = {}
  Object.keys(categories).forEach((gcKey) => {
    gameCards += categories[gcKey].amount
    eM[gcKey] = categories[gcKey].amount
  })
  let ratio = (pictureAmount + gameCards) / gameCards
  ratio = [ratio, ratio]
  gameCards--
  var oL = {}
  Object.keys(raw.cards).forEach((key) => {
    oL[key] = raw.cards[key].length
  })
  oL['pictures'] = raw.pictures.length

  // Get Schwifty
  console.debug('<tease.js / generateFileList> Going into swifty mode with the following data:', {eM: eM, raw: raw, ratio: ratio, gameCards: gameCards, oL: oL, icl: icl, biglist: biglist})
  for (var n = 0; n < (pictureAmount + gameCards); n++) {
    if (n + 1 > ratio[0] && n !== 0 && Object.keys(raw.cards).length > 0) {
      ratio[0] += ratio[1]
      var pcat
      if (order.enabled !== true) {
        pcat = Object.keys(raw.cards)[Math.floor(Math.random() * Object.keys(raw.cards).length)]
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
      } else {
        let num = Math.floor((ratio[0] - ratio[1]) / ratio[1]) - 1
        let card = biglist[num]
        console.debug('Currently at num ' + num + ' (' + ratio[0] + '). We got this card here ' + biglist[num])
        card = card.split(':=:')
        pcat = card[0]
        fin.push(card[1])
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
  // console.debug('<tease.js / generateFileList>\nCould not fill all categories:', eM)
  fin = clean(fin, undefined)
  fin.forEach((r, i) => {
    // console.debug('<tease.js / generateFileList> Fin replace with r:', r, 'and i:', i)
    if (r !== undefined) fin[i] = r.replace(/\\/g, '/')
  })
  dfd.resolve([fin, icl])
  return dfd.promise()
}

$(document).ready(_ => {
  mdc.autoInit()
  updateSuggestion('all')
})
