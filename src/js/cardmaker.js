/* global $, dialog, app, mdc, Image, fs, storage */
function setStep (step) {
    $('.box').slideUp(200, () => {
        $('#cardMaker-' + step).slideDown(200)
    })
}

function localize(path) {
    if (path.indexOf(':///') === -1)
        return 'local:///' + path
    else
        return path.replace(/^[a-z]+:\/+/gi, 'local:///')
}

function delocalize(path) {
    if (path.indexOf(':///') !== -1)
        path = path.split(':///')[1]
    return path
}

if (typeof pngImage === 'undefined') var pngImage

var genderSelect = new mdc.select.MDCSelect($('#genderSelect')[0])

//#region Image Functions
function createFit (srcWidth, srcHeight) { // Create a fit for the card image
    let orientation, ratio
    ratio = 1
    srcWidth >= srcHeight ? orientation = 1 : orientation = 2
    if (orientation === 1) { // Horizontal Image
        if (srcWidth > 600) { ratio = 600 / srcWidth }
        if (srcHeight * ratio > 400) { ratio = 400 / srcHeight } // Fix for images that are too square
    } else if (orientation === 2) { // Vertical Image
        if (srcHeight > 550) { ratio = 550 / srcHeight }
        if (srcWidth * ratio > 500) { ratio = 500 / srcWidth } // Fix for images that are too square
    }
    return { // Returns an object with the desired width & height of the cardimage.
        orientation: orientation,
        width: Math.ceil(srcWidth * ratio),
        height: Math.ceil(srcHeight * ratio)
    }
}

function createFitB (srcWidth, srcHeight) { // Create a fit for the deck image
    var ratio = 1
    if (srcWidth > 94) ratio = 94 / srcWidth
    if (srcHeight * ratio > 94) ratio = 94 / srcHeight // Fix for images that are too square
    return {
        width: Math.ceil(srcWidth * ratio),
        height: Math.ceil(srcHeight * ratio)
    }
}

function properWrap (ctx, text, x, y, maxWidth, lineHeight) {
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

function textOverflow (ctx, text, cardImageHeight, canvasWidth, canvasHeight, lineHeight) {
    let lines = 1.5
    for (var i = 0; i < text.length; i++) {
        let words = text[i].split(' ')
        let line = ''
        for (var n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' '
            let testWidth = ctx.measureText(testLine).width
            if (testWidth > canvasWidth) {
                lines += 1
                line = ''
            } else {
                line = testLine
            }
        }
        lines += 1
    }
    // console.debug('<cardmaker.html / textOverflow> cardImageHeight + (lines * lineHeight) =', cardImageHeight + (lines * lineHeight))
    if ((cardImageHeight + (lines * lineHeight)) > canvasHeight) {
        console.debug('<tease.js / textOverflow> Returning ', (cardImageHeight + (lines * lineHeight)) - canvasHeight)
        return (cardImageHeight + (lines * lineHeight)) - canvasHeight
    } else {
        console.debug('<tease.js / textOverflow> Returning zero.')
        return 0
    }
}

function generateImage () {
    let canvas = document.createElement('canvas')
    let context = canvas.getContext('2d')
    settings.cardImageDimensions = createFit(settings.cardImage.width, settings.cardImage.height)
    settings.deckImageDimensions = createFitB(settings.deckImage.width, settings.deckImage.height)
    if (settings.cardImageDimensions.orientation === 1) {
        canvas.width = 750
        canvas.height = 600
    } else if (settings.cardImageDimensions.orientation === 2) {
        canvas.width = 600
        canvas.height = 750
    }
    // console.debug('TextOverflow: ', textOverflow(context, settings.cardText, settings.cardImageDimensions.height + 132, canvas.width, canvas.height, 15))
    context.textBaseline = 'hanging'
    context.font = '18px Arial'
    canvas.height += textOverflow(context, settings.cardText, settings.cardImageDimensions.height + 132, canvas.width, canvas.height, 15)
    let leftBorder = canvas.width / 2 - Math.ceil(settings.cardImageDimensions.width / 2) - 3
    context.fillStyle = '#000000'
    if (settings.useSpecial) context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fill()
    context.beginPath()
    context.lineWidth = '2'
    context.rect(leftBorder, 50, settings.cardImageDimensions.width + 2, settings.cardImageDimensions.height + 2)
    context.strokeStyle = '#ffffff'
    if (settings.useSpecial) context.strokeStyle = '#000000'
    context.stroke() // Add card image border
    context.drawImage(settings.cardImage, leftBorder + 1, 51, settings.cardImageDimensions.width, settings.cardImageDimensions.height)
    context.fillStyle = '#ffffff'
    if (settings.useSpecial) context.fillStyle = '#000000'
    context.textBaseline = 'hanging'
    context.font = '13px Arial'
    context.fillText('Custom Tease Instructor' + (settings.type === 'ctis' ? ' Script' : ''), leftBorder - 1, 15) // Add 'Custom Tease Instructor (Script)'
    context.font = '15px Arial Black'
    context.fillText(settings.deckName, leftBorder - 1, 30) // Add deck name
    context.textAlign = 'end'
    context.font = '13px Arial'
    context.fillText(settings.author, leftBorder + settings.cardImageDimensions.width + 4, 32) // Add author Name
    context.textAlign = 'center'
    context.font = '63px Times New Roman'
    context.fillText(settings.cardType.toUpperCase(), canvas.width / 2, 71 + settings.cardImageDimensions.height, canvas.width - 6) // Add card type
    context.font = '18px Arial'
    let liney = settings.cardImageDimensions.height + 134
    for (var i = 0; i < settings.cardText.length; i++) {
        console.debug('Processing line:', settings.cardText[i], 'With liney:', liney)
        liney = properWrap(context, settings.cardText[i], canvas.width / 2, liney, canvas.width - 10, 20) // Add card text
    }
    context.drawImage(settings.genderImage, Math.floor((canvas.width / 2 - settings.cardImageDimensions.width / 2) / 2 - (settings.genderImage.width / 2)) < 0 ? -1 : Math.floor((canvas.width / 2 - settings.cardImageDimensions.width / 2) / 2 - settings.genderImage.width / 2), 108)
    context.globalAlpha = 0.5
    context.drawImage(settings.deckImage, 4, 4, settings.deckImageDimensions.width, settings.deckImageDimensions.height)
    context.drawImage(settings.tagImage, leftBorder + 5 + settings.cardImageDimensions.width, 50 + settings.cardImageDimensions.height - settings.tagImage.height)
    $('#sneakPeek').append(canvas)
    return canvas.toDataURL('image/png')
}
//#endregion

var settings = {} // type, convert, cardType, imgPath, saveLoc, deckImage, author

if (storage.get('cardMaker.load')) { // load, saveLoc, gender, author, deckName, deckImage
    settings = storage.get('cardMaker')
    $('#saveSettings').prop('checked', true)
    $('#saveLocLabel').text(settings.saveLoc)
    $('#saveLocLabel').fadeIn(100)
    $('#getSaveLoc').text(settings.saveLoc)
    genderSelect.selectedIndex = ['neutral', 'male', 'female', 'transsexual', 'straightcouple', 'gaycouple', 'lesbiancouple'].indexOf(settings.gender)
    $('#author').val(settings.author)
    $('#deckName').val(settings.deckName)
    $('#cardtype-' + settings.type).trigger('click')
    if (settings.type === 'ctis') $('#convert-cti1-field').slideDown(100)
    $('#convert-cti1').prop('checked', settings.convert)
    let dil = settings.deckImage
    settings.deckImage = new Image()
    settings.deckImage.src = localize(dil)
    $('#deckImageLabel').text(settings.deckImage.src.substr(9))
    $('#deckImageLabel').fadeIn(100)
} else {
    settings.deckImage = new Image()
    settings.gender = 'neutral'
}

$(document).ready(() => {
    $('.mdc-text-field').each((i, el) => {
        mdc.textField.MDCTextField.attachTo(el)
    })
    $('.mdc-radio').each((i, el) => {
        mdc.radio.MDCRadio.attachTo(el)
    })
    $('.mdc-switch').each((i, el) => {
        mdc.switchControl.MDCSwitch.attachTo(el)
    })
    $('.mdc-button').each((i, el) => {
        mdc.ripple.MDCRipple.attachTo(el)
    })
    mdc.autoInit()
    updateNextButton()
})

function saveSettings() {
    if (settings.load) {
        storage.set('cardMaker', {
            type: settings.type,
            convert: settings.convert,
            load: settings.load,
            saveLoc: settings.saveLoc,
            gender: settings.gender,
            author: settings.author,
            deckName: settings.deckName,
            deckImage: settings.deckImage.src
        })
    }
}

// Setup
settings.cardImage = new Image()
settings.genderImage = new Image()
settings.tagImage = new Image()
settings.tagImage.src = `local:///${__dirname}/cardmaker/tag.png`

function updateNextButton() {
    // Step 1: CTIS type, save location
    if (['cti1', 'ctis'].indexOf(settings.type) !== -1 &&
        typeof settings.saveLoc === 'string' &&
        settings.saveLoc !== '')
        $('#step-0-next').prop('disabled', false)
    else
        $('#step-0-next').prop('disabled', true)

    // Step 2: card image
    if (typeof settings.cardImage.src === 'string' &&
        settings.cardImage.src !== '')
        $('#step-1-next').prop('disabled', false)
    else
        $('#step-1-next').prop('disabled', true)
}

//#region First step
$('#saveSettings').change(() => {
    settings.load = $('#saveSettings').is(':checked')
})

$('#cardtype-cti1, #cardtype-ctis').click((event) => {
    if ($(event.target).attr('id') === 'cardtype-cti1') {
        settings.type = 'cti1'
        $('#saveLocField').slideDown(200)
        $('#convert-cti1-field').slideUp(200)
    } else {
        settings.type = 'ctis'
        if (settings.convert === true) $('#saveLocField').slideUp(200)
        $('#convert-cti1-field').slideDown(200)
    }
    updateNextButton()
})

$('#convert-cti1-field').click((event) => {
    if ($(event.target).is(':checked')) {
        settings.convert = true
        $('#saveLocField').slideUp(200)
    } else {
        settings.convert = false
        $('#saveLocField').slideDown(200)
    }
})

$('#saveLocBtn').click(() => {
    dialog.showOpenDialog({
        title: 'Select Save Location',
        properties: ['openDirectory']
    }, (path) => {
        if (path !== '' && path !== undefined) {
            $('#saveLocLabel').text(path)
            $('#saveLocLabel').fadeIn(100)
            $('#getSaveLoc').text(path)
            settings.saveLoc = localize(path[0])
        } else {
            $('#saveLocLabel').fadeOut(100)
            $('#getSaveLoc').text('nowhere')
            settings.saveLoc = undefined
        }
        updateNextButton()
    })
})

$('#step-0-next').click(() => {
    if (!$('#step-0-next').is(':disabled'))
        saveSettings()
        setStep(1)
})
//#endregion

//#region Second step
$('#browsePictureBtn').click(() => {
    dialog.showOpenDialog({
        title: 'Select Card Image',
        filters: [
            {name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'gif']},
            {name: 'All Files', extensions: ['*']}
        ],
        properties: ['openFile']
    }, (path) => {
        if (path !== undefined) path = localize(path[0])
        console.debug('<cardmaker.html / [#browsePictureBtn]> Image selected, path is', path)
        if (path !== '' && path !== undefined) {
            $('#browsePictureLabel').text(path)
            $('#browsePictureLabel').fadeIn(100)
            settings.cardImage.src = localize(path)
            if (!settings.convert) $('#cardInfo').slideDown(200)
        } else {
            $('#browsePictureLabel').fadeOut(100)
            $('#cardInfo').slideUp(200)
        }
        updateNextButton()
    })
})

$('#cardType').change(() => {
    let val = $('#cardType').val()
    settings.cardType = val
    if (val === '' || val === undefined) settings.cardType = ''
})

settings.useSpecial = false
$('#useSpecial').click(() => {
    settings.useSpecial = $('#useSpecial').is(':checked')
    $('#genderSelect').trigger('MDCSelect:change')
})

$('#cardText').change(() => {
    if ($('#cardText').val() === '') {
        settings.cardText = ['']
    } else {
        settings.cardText = $('#cardText').val().replace(/\r\n/g, '\n').split('\n')
    }
})

$('#author').change(() => {
    if ($('#author').val() === '') {
        settings.author = 'Anonymous'
    } else {
        settings.author = $('#author').val()
    }
})

genderSelect.listen('MDCSelect:change', () => {
    settings.gender = genderSelect.value.split('-')[1] || 'neutral'
    if (settings.useSpecial) {
        settings.genderImage.src = `local:///${__dirname}/cardmaker/gendericons/` + settings.gender + `-inverse.png`
    } else {
        settings.genderImage.src = `local:///${__dirname}/cardmaker/gendericons/` + settings.gender + `.png`
    }
})

$('#deckImageBtn').click(() => {
    dialog.showOpenDialog({
        title: 'Select Deck Image',
        filters: [
            {name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'gif']},
            {name: 'All Files', extensions: ['*']}
        ],
        properties: ['openFile']
    }, (path) => {
        if (path !== undefined) path = path[0]
        console.debug('<cardmaker.html / [#browsePictureBtn]> Image selected, path is', path)
        if (path !== '' && path !== undefined) {
            $('#deckImageLabel').text(path)
            $('#deckImageLabel').fadeIn(100)
            settings.deckImage.src = localize(path)
        } else {
            if (settings.type === 'ctis') {
                settings.deckImage.src = `local:///${__dirname}/cardmaker/ctis-logo.png`
            } else {
                settings.deckImage.src = `local:///${__dirname}/cardmaker/cti1-logo.png`
            }
            $('#deckImageLabel').fadeOut(100)
        }
    })
})

$('#deckName').change(() => {
    if ($('#deckName').val() === '') {
        settings.deckName = 'Supplemental'
    } else {
        settings.deckName = $('#deckName').val()
    }
})

$('#step-1-prev').click(() => setStep(0))

$('#step-1-next').click(() => {
    if (!$('#step-1-next').is(':disabled')) {
        if (settings.convert && settings.type === 'ctis') {
            setStep(3)
        } else {
            let uri = generateImage()
            setStep(2)
            let matches = uri.match(/^data:.+\/(.+);base64,(.*)$/)
            pngImage = Buffer.alloc(matches[2].length, matches[2], 'base64')
        }
        saveSettings()
    }
})
//#endregion

//#region Third step / Sneak Peek
$('#step-2-prev').click(() => {
    setStep(1)
    $('#sneakPeek').empty()
})

$('#step-2-next').click(() => {
    if (settings.type === 'ctis') {
        saveSettings()
        setStep(3)
    } else {
        saveSettings()
        let getF = fs.readdirSync(settings.saveLoc)
        let n = 1
        getF.forEach((file) => {
            if (file.toLowerCase().indexOf(settings.deckName.toLowerCase() + '.' + settings.cardType.toLowerCase()) !== -1) n++
        })
        let filename = settings.saveLoc + '/' + settings.type.toUpperCase() + '.' + settings.author + '.' + settings.deckName + '.' + settings.cardType + '.' + n
        fs.writeFileSync(filename + '.png', pngImage)
        setStep(4)
    }
})
//#endregion

//#region Fourth Step / CTIS hopdaflop
$('#addAction').click(() => {
    let n = $('.action-block').length
    $('<table id="action-' + n + '" class="action-block" style="font-family: monospace; background-color: rgba(0, 0, 0, 0.2); width: 50%;"><tbody><tr><td>&nbsp;&nbsp;&nbsp;&nbsp;{</td><td></td></tr><tr class="action-row"><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;start:</td><td><input type="text" name="start" /></td><td>,</td></tr><tr class="action-row"><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;type:</td><td><input type="text" name="type" /></td><td>,</td></tr><tr class="action-row"><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;conditional:</td><td><input type="text" name="conditional" /></td><td>,</td></tr><tr class="action-row"><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;for:</td><td><input type="text" name="fors" /></td><td>,</td></tr><tr class="action-row"><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;action:</td><td><input type="text" name="action" /></td><td>,</td></tr><tr class="action-row"><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;until:</td><td><input type="text" name="until" /></td><td>,</td></tr><tr><td class="lae">&nbsp;&nbsp;&nbsp;&nbsp;}</td><td></td></tr></tbody></table>').insertAfter($('.action-block')[$('.action-block').length - 1])
    $($('.lae')[$('.action-block').length - 2]).html('&nbsp;&nbsp;&nbsp;&nbsp;},')
})

$('#removeAction').click(() => {
    $('#action-' + ($('.action-block').length - 1)).remove()
    $($('.lae')[$('.action-block').length - 1]).html('&nbsp;&nbsp;&nbsp;&nbsp;}')
})

$('#resetAction').click(() => {
    for (var i = 1; i < $('.action-block').length; i++) {
        $('.action-block')[i].remove()
    }
    $('#action-0').find('input').val('')
    $($('.lae')[$('.action-block').length - 1]).html('&nbsp;&nbsp;&nbsp;&nbsp;}')
})

$('#advancedMode').change(() => {
    if ($('#advancedMode').is(':checked')) {
        $('#action-basic').slideUp(200, () => {
            $('#action-advanced').slideDown(200)
        })
    } else {
        $('#action-advanced').slideUp(200, () => {
            $('#action-basic').slideDown(200)
        })
    }
})

$('#step-3-prev').click(() => {
    if (settings.convert && settings.type === 'ctis') {
        setStep(1)
    } else {
        setStep(2)
    }
})

$('#step-3-next').click(() => {
    saveSettings()
    let ctisactions = {
        actions: []
    }
    if ($('#advancedMode').is(':checked')) {
        ctisactions.actions = [$('#adv-act').val()]
    } else {
        for (let i = 0; i < $('.action-block').length; i++) {
            let ret = true
            let act = {}
            let block = $('.action-block')[i]
            let inputs = [
                $(block).find('input[name="start"]').val(),
                $(block).find('input[name="type"]').val(),
                $(block).find('input[name="conditional"]').val(),
                $(block).find('input[name="fors"]').val(),
                $(block).find('input[name="action"]').val(),
                $(block).find('input[name="until"]').val()
            ]
            inputs.forEach((inp, i) => {
                if (typeof inp === 'string') {
                    inputs[i] = inp.replace(/'/g, '\'')
                }
            })
            if (inputs[0] !== 'start' && inputs[0] !== 'draw') ret = false
            act.start = inputs[0]
            if (['ignore', 'contact', 'position', 'instruction', 'strokecount', 'slidetime', 'setslide', 'ctc', 'ctc:force', 'mood', 'sublevel', 'item', 'key', 'chastity', 'stop'].indexOf(inputs[1]) === -1) ret = false
            act.type = inputs[1]
            if (inputs[2].match(/(^((slidetime|strokecount|sublevel):((<|>)=?|==|!=):\d+(:force)?|((chastity:(true|false)|mood:(good|neutral|bad)|(nextinstruction|lastinstruction):\w+)(:force)?))$|^$|^undefined$)/gi).length !== null) ret = false
            if (inputs[2] === '' || inputs[2] === 'undefined') inputs[2] = undefined
            act.conditional = inputs[2]
            if (inputs[3] !== 'instant' && inputs[3].indexOf('type:') === -1 && inputs[3].indexOf('cum:') === -1) ret = false
            act.fors = inputs[3]
            if (inputs[4] === '' && act.type !== 'key') ret = false
            if ((inputs[4] === '' || inputs[4] === 'undefined') && act.type === 'key') inputs[4] = undefined
            act.action = inputs[4]
            if (inputs[5] !== 'instant' && inputs[5] !== 'end' && inputs[5].indexOf('type:') === -1 && inputs[5].indexOf('cum:') === -1) ret = false
            act.until = inputs[5]
            if (ret) {
                ctisactions.actions.push(act)
            }
            console.debug(inputs)
        }
    }
    if (ctisactions.actions.length === $('.action-block').length || $('#advancedMode').is(':checked')) {
        if ($('#advancedMode').is(':checked')) ctisactions = ctisactions.actions[0].replace(/\n\r/g, '')
        let json = $('#advancedMode').is(':checked') ? ctisactions : JSON.stringify(ctisactions)
        let n = 1
        let getF = fs.readdirSync(delocalize(settings.saveLoc))
        getF.forEach((file) => {
            if (file.lastIndexOf('.ctis') === -1) {
                if (file.toLowerCase().indexOf(settings.deckName.toLowerCase() + '.' + settings.cardType.toLowerCase()) !== -1) n++
            }
        })
        let filename = settings.saveLoc + '/' + settings.type.toUpperCase() + '.' + settings.author + '.' + settings.deckName + '.' + settings.cardType + '.' + n
        while (getF.indexOf(filename) > 0) {
            n++
            filename = settings.saveLoc + '/' + settings.type.toUpperCase() + '.' + settings.author + '.' + settings.deckName + '.' + settings.cardType + '.' + n
        }
        filename = delocalize(filename)
        fs.writeFileSync(filename + '.ctis', json)
        if (!settings.convert) {
            fs.writeFileSync(filename + '.png', pngImage)
        }
        setStep(4)
    } else {
        $('#CTISWrong').slideDown(200)
    }
})
//#endregion