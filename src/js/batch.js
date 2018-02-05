/* global $, mdc, dialog, storage, fs, Image */
var cards = {}
var images = {free: [], taken: []}
var settings = storage.get('batchCardMaker')
var deckImage = new Image()
deckImage.src = `file://${__dirname}/cardmaker/cti1-logo.png`
var tagImage = new Image()
tagImage.src = `file://${__dirname}/cardmaker/tag.png`
if (typeof settings === 'object' && settings.save === true) {
  $('#bcc-save').prop('checked', true)
  if (settings.type != null) {
    $('#bcc-type-' + settings.type.substr(3, 1)).prop('checked', true)
    if (settings.type === 'ctis') $('#bcc-convert').parents('.mdc-form-field').show()
    deckImage.src = `file://${__dirname}/cardmaker/${settings.type}-logo.png`
  }
  if (settings.convert === true) storage.set('batchCardMaker.convert', false)
  if (settings.imageFolder != null) {
    $('#bcc-image-folder-label').text(settings.imageFolder).fadeIn(200)
    $('#bcc-image-folder').removeClass('mdc-button--primary')
  }
  if (settings.imageFolderRecursive === true) $('#bcc-image-folder-recursive').prop('checked', true)
  if (settings.imageSelection != null) $('#bcc-image-select-' + settings.imageSelection).prop('checked', true)
  if (settings.saveFolder != null) {
    $('#bcc-save-folder-label').text(settings.saveFolder).fadeIn(200)
    $('#bcc-save-folder').removeClass('mdc-button--primary')
  }
  if (settings.saveFolderSort === true) $('#bcc-save-folder-sort').prop('checked', true)
  if (settings.author != null) $('#bcc-author').val(settings.author)
  if (settings.deckName != null) $('#bcc-deck-name').val(settings.deckName)
  if (settings.deckImage != null) {
    deckImage.src = settings.deckImage
    $('#bcc-deck-image-label').text(settings.deckImage).fadeIn(200)
    $('#bcc-deck-image').removeClass('mdc-button--primary')
  }
}
settings = (setting, value) => {
  if (value == null) return storage.get('batchCardMaker.' + setting)
  return storage.set('batchCardMaker.' + setting, value)
}

function getImages (path, recursive) {
  let folder = fs.readdirSync(path)
  let ret = []
  folder.forEach((sub) => {
    let substat = fs.statSync(path + '/' + sub)
    if (substat.isDirectory() && recursive === true && sub !== 'deleted') ret = ret.concat(getImages(path + '/' + sub, true))
    else if (substat.isFile()) ret.push(path + '/' + sub)
  })
  for (let i = 0; i < ret.length; i++) {
    let subExtension = ret[i].split('.').slice(-1)[0]
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].indexOf(subExtension.toLowerCase()) === -1) {
      ret.splice(i, 1)
      i--
    }
  }
  return ret
}

$('#swapper').ready(() => {
  // General
  mdc.autoInit()
  mdc.linearProgress.MDCLinearProgress.attachTo($('.mdc-linear-progress')[0]).open()

  function createFitA (srcWidth, srcHeight) {
    let orientation
    let ratio = 1
    if (srcWidth >= srcHeight) orientation = 'landscape'
    else orientation = 'portrait'
    if (orientation === 'landscape') {
      if (srcWidth > 600) ratio = 600 / srcWidth
      if (srcHeight * ratio > 400) ratio = 400 / srcHeight
    } else {
      if (srcHeight > 550) ratio = 550 / srcHeight
      if (srcWidth * ratio > 500) ratio = 500 / srcWidth
    }
    return {orientation: orientation, width: Math.round(srcWidth * ratio), height: Math.round(srcHeight * ratio)}
  }

  function createFitB (srcHeight, srcWidth) {
    let ratio = 1
    if (srcWidth > 94) ratio = 94 / srcWidth
    if (srcHeight * ratio > 94) ratio = 94 / srcHeight
    return {width: Math.round(srcWidth * ratio), height: Math.round(srcHeight * ratio)}
  }

  function textOverflow (ctx, text, cardImageHeight, canvasWidth, canvasHeight, lineHeight) {
    let lines = 1.5
    for (var i = 0; i < text.length; i++) {
      let words = text[i].split(' ')
      let line = ''
      for (var n = 0; n < words.length; n++) {
        let testLine = line + words[n]
        let testWidth = ctx.measureText(testLine).width
        if (testWidth > canvasWidth) {
          lines += 1
          line = ''
        } else line = testLine
      }
      lines += 1
    }
    if ((cardImageHeight + (lines * lineHeight)) > canvasHeight) return (cardImageHeight + (lines * lineHeight)) - canvasHeight
    else return 0
  }

  function properWrite (ctx, text, x, y, maxWidth, lineHeight) {
    let words = text.split(' ')
    let line = ''
    for (var n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' '
      let testWidth = ctx.measureText(testLine).width
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y)
        line = words[n] + ' '
        y += lineHeight
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, x, y)
    return y + lineHeight
  }

  function cardMaker (card, canvas, callback) {
    canvas = canvas || document.createElement('canvas')
    let context = canvas.getContext('2d')
    let image = new Image()
    let gender = new Image()
    let gendersrc = (card.gender || 'neutral') + (card.special ? '-inverse' : '')
    gender.src = `file://${__dirname}/cardmaker/gendericons/${gendersrc}.png`
    image.src = card.image
    image.onload = () => {
      console.debug(`Origial card image size: ${image.width}x${image.height}`)
      let cardImageDimensions = createFitA(image.width, image.height)
      console.debug(`Fitted card image: ${cardImageDimensions.orientation}, ${cardImageDimensions.width}x${cardImageDimensions.height}`)
      let deckImageDimensions = createFitB(deckImage.width, deckImage.height)
      if (cardImageDimensions.orientation === 'landscape') {
        canvas.width = 750
        canvas.height = 600
      } else {
        canvas.width = 600
        canvas.height = 750
      }
      context.textBaseline = 'hanging'
      context.font = '18px Arial'
      canvas.height += textOverflow(context, card.text.split('\n'), cardImageDimensions.height + 132, canvas.width, canvas.height, 15)
      let leftBorder = canvas.width / 2 - Math.ceil(cardImageDimensions.width / 2) - 3
      if (card.special) context.fillStyle = '#ffffff'
      else context.fillStyle = '#000000'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.fill()
      context.beginPath()
      context.lineWidth = '2'
      context.rect(leftBorder, 50, cardImageDimensions.width + 2, cardImageDimensions.height + 2)
      if (card.special) context.strokeStyle = '#000000'
      else context.strokeStyle = '#ffffff'
      context.stroke()
      context.drawImage(image, leftBorder + 1, 51, cardImageDimensions.width, cardImageDimensions.height)
      if (card.special) context.fillStyle = '#000000'
      else context.fillStyle = '#ffffff'
      context.textBaseline = 'hanging'
      context.font = '13px Arial'
      context.fillText('Custom Tease Instructor' + (settings('type') === 'ctis' ? ' Script' : ''), leftBorder - 1, 15)
      context.font = '15px Arial Black'
      context.fillText((settings('deckName') || 'Supplemental'), leftBorder - 1, 30)
      context.textAlign = 'end'
      context.font = '13px Arial'
      context.fillText((settings('author') || 'Anonymous'), leftBorder + cardImageDimensions.width + 4, 32)
      context.textAlign = 'center'
      context.font = '63px Times New Roman'
      context.fillText((card.type || '').toUpperCase(), canvas.width / 2, 71 + cardImageDimensions.height, canvas.width - 6)
      context.font = '18px Arial'
      let liney = cardImageDimensions.height + 134
      for (let i = 0; i < card.text.split('\n').length; i++) {
        liney = properWrite(context, card.text.split('\n')[i], canvas.width / 2, liney, canvas.width - 10, 20)
      }
      context.drawImage(gender, Math.floor((canvas.width / 2 - cardImageDimensions.width / 2) / 2 - (gender.width / 2)) < 0 ? -1 : Math.floor((canvas.width / 2 - cardImageDimensions.width / 2) / 2 - gender.width / 2), 108)
      context.globalAlpha = 0.5
      context.drawImage(deckImage, 4, 4, deckImageDimensions.width, deckImageDimensions.height)
      context.drawImage(tagImage, leftBorder + 5 + cardImageDimensions.width, 50 + cardImageDimensions.height - tagImage.height)
      callback(canvas)
    }
  }

  function generateCards () {
    let fin = 0
    let dfd = $.Deferred()
    let keys = Object.keys(cards)
    for (var i = 0; i < keys.length; i++) {
      dfd.notify('buffer')
      cardMaker(cards[keys[i]], document.createElement('canvas'), (canvas) => {
        cards[keys[fin]].dataURL = canvas.toDataURL('image/png')
        fin++
        dfd.notify('progress')
        if (fin >= Object.keys(cards).length - 1) {
          dfd.resolve()
        }
      })
    }
    return dfd
  }

  function SaveCards (type) {
    let dfd = $.Deferred()
    let keys = Object.keys(cards)
    let n = {}
    let fin = 0
    // Add a 0 counter for each type
    keys.forEach((key) => {
      n[cards[key].type] = 1
    })
    if (settings('saveFolderSort') !== true) {
      let getF = fs.readdirSync(settings('saveFolder'))
      getF.forEach((file) => {
        Object.keys(n).forEach((type) => {
          if (file.lastIndexOf('.ctis') === -1) {
            if (file.toLowerCase().indexOf(settings('deckName').toLowerCase() + '.' + type) !== -1) {
              n[type]++
            }
          }
        })
      })
    } else {
      Object.keys(n).forEach((type) => {
        if (fs.existsSync(settings('saveFolder') + '/' + type)) {
          let getF = fs.readdirSync(settings('saveFolder') + '/' + type)
          getF.foreach((path) => {
            if (['.png', '.jpeg', '.jpg', '.bmp'].indexOf(path.split(/\.(?:.(?!\.))+$/gim)) !== -1) n[type]++
          })
        } else {
          fs.mkdirSync(settings('saveFolder') + '/' + type)
        }
      })
    }
    if (type === 'ctis') {
      keys.forEach((key) => {
        dfd.notify('buffer')
        let card = cards[key]
        let filename
        if (settings('saveFolderSort') === true) filename = settings('saveFolder') + '/' + card.type + '/' + settings('type').toUpperCase() + '.' + settings('author') + '.' + settings('deckName') + '.' + card.type + '.' + n[card.type]++
        else filename = settings('saveFolder') + settings('type').toUpperCase() + '.' + settings('author') + '.' + settings('deckName') + '.' + card.type + '.' + n[card.type]++
        if (settings('convert') !== true) {
          let matches = cards[key].dataURL.match(/^data:.+\/(.+);base64,(.*)$/)
          fs.writeFileSync(filename + '.png', Buffer.alloc(matches[2].length, matches[2], 'base64'))
        }
        fs.writeFileSync(filename + '.ctis', cards[key].ctis || '{"actions":[]}')
        dfd.notify('progress')
        if (++fin >= keys.length) {
          dfd.resolve()
        }
      })
    } else if (type === 'cti1') {
      keys.forEach((key) => {
        dfd.notify('buffer')
        let card = cards[key]
        let filename
        if (settings('saveFolderSort') === true) filename = settings('saveFolder') + '/' + card.type + '/' + settings('type').toUpperCase() + '.' + settings('author') + '.' + settings('deckName') + card.type + '.' + n[card.type]++
        else filename = settings('saveFolder') + '/' + settings('type').toUpperCase() + '.' + settings('author') + '.' + settings('deckName') + '.' + card.type + '.' + n[card.type]++
        let matches = cards[key].dataURL.match(/^data:.+\/(.+);base64,(.*)$/)
        fs.writeFileSync(filename + '.png', Buffer.alloc(matches[2].length, matches[2], 'base64'))
        dfd.notify('progress')
        if (++fin >= Object.keys(cards).length) {
          dfd.resolve()
        }
      })
    } else {
      dfd.reject('No such type')
    }
    return dfd
  }

  // Screen 0: settings
  $('#bcc-save').on('click', () => { settings('save', $('#bcc-save').is(':checked')) })

  $('[name="bcc-type"]').on('click', () => {
    if ($('#bcc-type-1').is(':checked')) {
      settings('type', 'cti1')
      //$('#bcc-convert').prop('checked', false).parents('.mdc-form-field').slideUp(200)
      if (deckImage.src === `file://${__dirname}/cardmaker/ctis-logo.png`) deckImage.src = `file://${__dirname}/cardmaker/cti1-logo.png`
    } else if ($('#bcc-type-s').is(':checked')) {
      settings('type', 'ctis')
      //$('#bcc-convert').parents('.mdc-form-field').slideDown(200)
      if (deckImage.src === `file://${__dirname}/cardmaker/cti1-logo.png`) deckImage.src = `file://${__dirname}/cardmaker/ctis-logo.png`
    } else settings('type', undefined)
    $('#bcc-0-next').trigger('settingsUpdate')
  })

  $('#bcc-convert').on('click', () => { settings('convert', $('#bcc-convert').is(':checked')) })

  $('#bcc-image-folder').on('click', () => {
    dialog.showOpenDialog({
      title: 'Select Image Folder',
      properties: ['openDirectory']
    }, (path) => {
      if (path !== '' && path != null) {
        $('#bcc-image-folder-label').text(path).fadeIn(100)
        $('#bcc-image-folder.mdc-button--primary').removeClass('mdc-button--primary')
        settings('imageFolder', path[0].split('\\').join('/'))
      } else {
        $('#bcc-image-folder-label').fadeOut(100)
        $('#bcc-image-folder:not(.mdc-button--primary)').addClass('mdc-button--primary')
        settings('imageFolder', undefined)
      }
      $('#bcc-0-next').trigger('settingsUpdate')
    })
  })

  $('#bcc-image-folder-recursive').on('click', () => { settings('imageFolderRecursive', $('#bcc-image-folder-recursive').is(':checked')) })

  $('[name="bcc-image-select"]').on('click', () => {
    if ($('#bcc-image-select-order').is(':checked')) settings('imageSelection', 'order')
    else if ($('#bcc-image-select-manual').is(':checked')) settings('imageSelection', 'manual')
    else if ($('#bcc-image-select-random').is(':checked')) settings('imageSelection', 'random')
    else settings('imageSelection', undefined)
    $('#bcc-0-next').trigger('settingsUpdate')
  })

  $('#bcc-save-folder').on('click', () => {
    dialog.showOpenDialog({
      title: 'Select Save Location',
      properties: ['openDirectory']
    }, (path) => {
      if (path !== '' && path != null) {
        $('#bcc-save-folder-label').text(path).fadeIn(100)
        $('#bcc-save-folder.mdc-button--primary').removeClass('mdc-button--primary')
        settings('saveFolder', path[0].split('\\').join('/'))
      } else {
        $('#bcc-save-folder-label').fadeOut(100)
        $('#bcc-save-folder:not(.mdc-button--primary)').addClass('mdc-button--primary')
        settings('saveFolder', undefined)
      }
      $('#bcc-0-next').trigger('settingsUpdate')
    })
  })

  $('#bcc-save-folder-sort').on('click', () => { settings('saveFolderSort', $('#bcc-save-folder-sort').is(':checked')) })

  $('#bcc-0-next').on('click', () => {
    if (!$('#bcc-0-next').is(':disabled')) {
      $('#bcc-0').slideUp(200, () => { $('#bcc-1').slideDown(200) })
    }
  })

  $('#bcc-0-next').on('settingsUpdate', () => {
    if (settings('type') != null &&
    settings('imageFolder') != null &&
    settings('imageSelection') != null &&
    settings('saveFolder') != null) {
      $('#bcc-0-next').prop('disabled', false)
    } else {
      $('#bcc-0-next').prop('disabled', true)
    }
  })

  $('#bcc-0-next').trigger('settingsUpdate')

  // Step 1: General card info
  $('#bcc-author').on('change', () => {
    if ($('#bcc-author').val() === '' || $('#bcc-author').val() == null) settings('author', undefined)
    else settings('author', $('#bcc-author').val())
  })

  $('#bcc-deck-name').on('change', () => {
    if ($('#bcc-deck-name').val() === '' || $('#bcc-deck-name').val() == null) settings('deckName', undefined)
    else settings('deckName', $('#bcc-deck-name').val())
  })

  $('#bcc-deck-image').on('click', () => {
    dialog.showOpenDialog({
      title: 'Select Deck Image',
      properties: ['openFile'],
      filters: [
        {name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico']}
      ]
    }, (path) => {
      if (path !== '' && path != null) {
        $('#bcc-deck-image-label').text(path).fadeIn(200)
        $('#bcc-deck-image.mdc-button--primary').removeClass('mdc-button--primary')
        deckImage.src = path[0].split('\\').join('/')
        settings('deckImage', path[0].split('\\').join('/'))
      } else {
        $('#bcc-deck-image-label').fadeOut(200)
        $('#bcc-deck-image:not(.mdc-button--primary)').addClass('mdc-button--primary')
        deckImage.src = './cardmaker/' + (settings('type') || 'cti1') + '-logo.png'
        settings('deckImage', undefined)
      }
    })
  })

  $('#bcc-1-previous').on('click', () => {
    $('#bcc-1').slideUp(200, () => { $('#bcc-0').slideDown(200) })
  })

  $('#bcc-1-next').on('click', () => {
    $('#bcc-1').slideUp(200, () => {
      $('#bcc-2').slideDown(200, () => {
        if (!(images.free.length !== 0 || images.taken.length !== 0)) $('#bcc-2').trigger('prep')
      })
    })
  })

  // Step 2: Card Overview
  $('#bcc-2').on('prep', () => {
    $('#bcc-imageLoad').slideDown(100)
    $('#bcc-card-add, #bcc-card-clear').prop('disabled', true)
    images = {free: [], taken: []}
    images.free = getImages(settings('imageFolder'), settings('imageFolderRecursive'))
    $('#bcc-imageLoad').slideUp(100)
    $('#bcc-card-add, #bcc-card-clear').prop('disabled', false)
  })

  $('#bcc-card-clear').on('click', () => {
    $('#bcc-cardList tr').remove()
    $('#bcc-2').trigger('prep')
  })

  $('#bcc-new').on('openup', (_, key) => {
    var brandnew = true
    var old = cards[key]
    if (key != null) brandnew = false
    if (brandnew) {
      key = Math.ceil(Math.random() * 10000)
      while (Object.keys(cards).indexOf(key) !== -1) {
        key += 1
        if (key > 10000) key = 1
      }
      cards[key] = {}
      $('#bcc-new-add').text('Add')
    } else {
      $('#bcc-new-type').val(cards[key].type || '')
      $('#bcc-new-text').val(cards[key].text || '')
      if (cards[key].image != null) {
        $('#bcc-new-image.mdc-button--primary').removeClass('mdc-button--primary')
        $('#bcc-new-image-label').text(cards[key].image).show()
        $('#bcc-new-add').prop('disabled', false)
      }
      $('#bcc-new-add').text('Update')
      $('#bcc-new-special').prop('checked', cards[key].special || false)
    }

    var cardImage
    if (settings('imageSelection') !== 'manual') {
      $('#bcc-new-image-sort').text(' (' + settings('imageSelection') + ' selection)')
      $('#bcc-new-image').removeClass('mdc-button--primary')
      if (brandnew) {
        let i = 0
        if (settings('imageSelection') === 'order') {
          if (images.free.length <= 0) {
            images.free = images.taken
            images.taken = []
          }
          images.taken.push(images.free.splice(0, 1)[0])
        } else {
          if (images.free.length <= 0) {
            images.free = images.taken
            images.taken = []
          }
          i = Math.floor(Math.random() * images.free.length)
          images.taken.push(images.free.splice(i, 1)[0])
        }
        cardImage = images.free[i]
        cards[key].image = cardImage
        $('#bcc-new-image-label').text(cardImage).show()
        $('#bcc-new-add').prop('disabled', false)
      }
    }

    $('#bcc-new').fadeIn(200)

    $('#bcc-new-type').on('change', () => { cards[key].type = $('#bcc-new-type').val() })
    $('#bcc-new-text').on('change', () => { cards[key].text = $('#bcc-new-text').val().replace(/\r\n/g, '\n') })
    var genderSelect = new mdc.select.MDCSelect($('#bcc-new-gender')[0])
    genderSelect.listen('MDCSelect:change', () => { cards[key].gender = genderSelect.value.split('-')[3] })

    $('#bcc-new-image').on('click', () => {
      dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          {name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico']}
        ]
      }, (path) => {
        if (path !== '' && path != null) {
          $('#bcc-new-image-label').text(path).fadeIn(200)
          $('#bcc-new-image.mdc-button--primary').removeClass('mdc-button--primary')
          $('#bcc-new-add').prop('disabled', false)
          cards[key].image = path[0]
        } else {
          $('#bcc-new-image-label').fadeOut(200)
          $('#bcc-new-image:not(.mdc-button--primary)').addClass('mdc-button--primary')
          $('#bcc-new-add').prop('disabled', true)
          cards[key].image = undefined
        }
      })
    })

    $('#bcc-new-special').on('click', () => { cards[key].special = $('#bcc-new-special').is(':checked') })

    $('#bcc-new-add').on('click', () => {
      if (!$('#bcc-new-add').is(':disabled')) {
        if (brandnew) $('#bcc-cardList').trigger('add', key)
        else $('#bcc-cardList').trigger('update', key)
        $('#bcc-new').fadeOut(200, () => { $('#bcc-new').trigger('clear') })
        $('#bcc-new-type, #bcc-new-text, #bcc-new-image, #bcc-new-image-label, #bcc-new-add, #bcc-new-special, #bcc-new-cancel').off()
      }
    })

    $('#bcc-new-cancel').on('click', () => {
      $('#bcc-new').fadeOut(200, () => { $('bcc-new').trigger('clear') })
      if (brandnew) delete cards[key]
      else cards[key] = old
      $('#bcc-new-type, #bcc-new-text, #bcc-new-image, #bcc-new-image-label, #bcc-new-add, #bcc-new-special, #bcc-new-cancel').off()
    })
  })

  $('#bcc-cardList').on('add', (_, key) => {
    let card = cards[key]
    $('#bcc-cardList').append(`<tr key="${key}"><td>${card.type}</td><td>${card.image.split('/').slice(-1)[0]}</td><td onclick="$('#bcc-new').trigger('openup', ${key})"><i class="material-icons">edit</i></td><td onclick="$('#bcc-preview').trigger('preview', ${key})"><i class="material-icons">visibility</i></td><td onclick="$('#bcc-cardList').trigger('delete', ${key})"><i class="material-icons">delete</i></td></tr>`)
    $('#bcc-2-next').prop('disabled', false)
  })

  $('#bcc-cardList').on('update', (_, key) => {
    let card = cards[key]
    $('#bcc-cardList tr[key="' + key + '"]').html(`<td>${card.type}</td><td>${card.image.split('/').slice(-1)[0]}</td><td onclick="$('#bcc-new').trigger('openup', ${key})"><i class="material-icons">edit</i></td><td onclick="$('#bcc-preview').trigger('preview', ${key})"><i class="material-icons">visibility</i></td><td onclick="$('#bcc-cardList').trigger('delete', ${key})"><i class="material-icons">delete</i></td>`)
  })

  $('#bcc-cardList').on('delete', (_, key) => {
    delete cards[key]
    $('#bcc-cardList tr[key="' + key + '"]').slideUp(200, function () {
      $(this).remove()
      if ($('#bcc-cardList tr').length === 0) $('#bcc-2-next').prop('disabled', true)
    })
  })

  $('#bcc-preview').on('preview', (_, key) => {
    let card = cards[key]
    let loadme = new mdc.linearProgress.MDCLinearProgress($('#bcc-preview .mdc-linear-progress')[0])
    loadme.open()
    $('#bcc-preview-image').hide()
    $('#bcc-preview').fadeIn(200, () => {
      cardMaker(card, document.createElement('canvas'), (canvas) => {
        $('#bcc-preview-image').attr('src', canvas.toDataURL('image/png')).slideDown(200)
        loadme.close()
      })
    })
  })

  $('#bcc-preview-close').on('click', () => {
    $('#bcc-preview').fadeOut(200)
  })

  $('#bcc-2-previous').on('click', () => {
    $('#bcc-2').slideUp(200, () => { $('#bcc-1').slideDown(200) })
  })

  $('#bcc-2-next').on('click', () => {
    if (!$('#bcc-2-next').is(':disabled')) {
      $('#bcc-2').slideUp(200, () => {
        $('#bcc-3').slideDown(200, () => { $('#bcc-3').trigger('prep') })
      })
    }
  })

  $('#bcc-new').on('clear', () => {
    $('#bcc-new-type, #bcc-new-text').val('')
    $('#bcc-new-image:not(.mdc-button--primary)').addClass('mdc-button--primary')
    $('#bcc-new-image-label').text('').hide()
    $('#bcc-new-add').prop('disabled', true)
    $('#bcc-new-special').prop('checked', false)
  })

  var cardGenerationProgress = {
    element: $('#bcc-3-progress')[0],
    bar: new mdc.linearProgress.MDCLinearProgress($('#bcc-3-progress')[0]),
    buffer: 0,
    current: 0,
    max: 0,
    upBuffer: (n) => {
      cardGenerationProgress.buffer += (n || 1)
      cardGenerationProgress.bar.foundation_.setBuffer(cardGenerationProgress.buffer / cardGenerationProgress.max)
    },
    upProgress: (n) => {
      cardGenerationProgress.current += (n || 1)
      if (cardGenerationProgress.current > cardGenerationProgress.buffer) cardGenerationProgress.buffer = cardGenerationProgress.current
      cardGenerationProgress.bar.foundation_.setProgress(cardGenerationProgress.current / cardGenerationProgress.max)
    }
  }

  $('#bcc-3').on('prep', () => {
    let progressbar = new mdc.linearProgress.MDCLinearProgress($('#bcc-3-progress')[0])
    progressbar.foundation_.setProgress(0)
    progressbar.foundation_.setBuffer(0)
    let max = Object.keys(cards).length
    let progress = 0
    let buffer = 0
    generateCards().then(() => {
      setTimeout(() => {
        $('#bcc-3').slideUp(200, () => {
          $('#bcc-4').trigger('prep')
        })
      }, 500)
    }, (err) => {
      if (err !== undefined) console.error('Error whilst generating cards:\n', err)
    }, (prog) => {
      if (prog === 'buffer') progressbar.foundation_.setBuffer(++buffer / max - 1)
      else if (prog === 'progress') progressbar.foundation_.setProgress(++progress / max - 1)
    })
  })

  $('#bcc-4').on('prep', () => {
    if (settings('type') === 'ctis') {
      for (let i = 0; i < Object.keys(cards).length; i++) {
        let card = cards[Object.keys(cards)[i]]
        $('#bcc-4-list').append(`<tr key="${Object.keys(cards)[i]}"><td>${card.type}</td><td>&nbsp;${card.image.split('/').slice(-1)}&nbsp;</td><td><button type="button" class="mdc-button mdc-button--secondary" onclick="$('#bcc-ctis').trigger('edit', ${Object.keys(cards)[i]})">Edit</button>&nbsp;<button type="button" class="mdc-button" onclick="$('#bcc-ctis').trigger('clear', ${Object.keys(cards)[i]})">Clear</button></td></tr>`)
      }
      $('#bcc-4').slideDown(200)
    } else {
      $('#bcc-5').trigger('prep')
      $('#bcc-5').slideDown(200)
    }
  })

  $('#bcc-4-previous').click(() => {
    $('#bcc-4').slideUp(200, () => {
      $('#bcc-2').slideDown(200)
    })
  })

  $('#bcc-4-next').click(() => {
    $('#bcc-4').slideUp(200, () => {
      $('#bcc-5').slideDown(200)
    })
    $('#bcc-5').trigger('prep')
  })

  $('#bcc-ctis').on('clear', (_, key) => {
    delete cards[key].ctis
  })

  $('#bcc-ctis').on('edit', (_, key) => {
    let card = cards[key]
    $('#bcc-ctis-type').val(card.type || '')
    $('#bcc-ctis-text').val(card.text || '')
    $('#bcc-ctis-edit').val(card.ctis || '')
    $('#bcc-ctis').fadeIn(200)
    $('#bcc-ctis-close, #bcc-ctis-save').on('click', function (e) {
      if ($(this).attr('id') === 'bcc-ctis-save') card.ctis = $('#bcc-ctis-edit').val()
      $('#bcc-ctis').fadeOut(200)
      $('#bcc-ctis-close, #bcc-ctis-save').off()
    })
  })

  $('#bcc-ctis-edit').on('keydown', function (e) {
    let keyCode = e.keyCode || e.which

    if (keyCode === 13) {
      e.preventDefault()
      let start = this.selectionStart
      let end = this.selectionEnd
      let depth = ($(this).val().substr(0, start).match(/{|\[/g) || []).length - ($(this).val().substr(0, start).match(/}|\]/g) || []).length
      let spacing = '\n'
      for (let i = 0; i < depth; i++) {
        spacing += '  '
      }
      $(this).val($(this).val().substr(0, start) + spacing + $(this).val().substring(end))
      this.selectionEnd = start + spacing.length
    } else if (keyCode === 221) {
      let start = this.selectionStart
      let end = this.selectionEnd
      if ($(this).val().substr(start - 2, start - 1) === '  ') {
        this.selectionStart -= 2
        $(this).val($(this).val().substr(0, start) + $(this).val().substring(end))
      }
    }
  })

  $('#bcc-5').on('prep', () => {
    let progressbar = new mdc.linearProgress.MDCLinearProgress($('#bcc-5-progress')[0])
    progressbar.foundation_.setProgress(0)
    progressbar.foundation_.setBuffer(0)
    let max = Object.keys(cards).length
    let progress = 0
    let buffer = 0
    SaveCards(settings('type')).then(() => {
      setTimeout(() => {
        $('#bcc-5').slideUp(200, () => {
          $('#bcc-6').slideDown(200)
        })
        $('#bcc-6').trigger('prep')
      }, 500)
    }, (err) => {
      if (err !== undefined) console.error('Error whilst saving cards:\n', err)
    }, (prog) => {
      if (prog === 'buffer') progressbar.foundation_.setBuffer(++buffer / max - 1)
      else if (prog === 'progress') progressbar.foundation_.setProgress(++progress / max - 1)
    })
  })
})

$('#bcc-6').on('prep', () => {
  $('#bcc-saveLoc').text(settings('saveFolder'))
})
