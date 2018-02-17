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

$(document).ready(_ => {
  mdc.autoInit()
  updateSuggestion('all')
})
