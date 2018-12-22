var { isNullOrUndefined, isBoolean, isString, isNumber, isArray } = require('util')

declare var mdc, dialog, BrowserWindow, globalShortcut, swapper, storage

var categories

/** Retrieves a folder path using a user dialog */
function getFolder(title = 'Select Folder', label?: string, setconfig?: string, folder?: string) {
    if (isNullOrUndefined(folder)) {
        dialog.showOpenDialog({
            title: title,
            properties: ['openDirectory']
        }, (path) => {
            if (isArray(path))
                path = path[0]

            if (!isNullOrUndefined(setconfig)) storage.set(setconfig, path)
            
            if (!isNullOrUndefined(label)) {
                if (path === '' || path === undefined) {
                    $(label).fadeOut(100)
                } else {
                    $(label).text(path)
                    $(label).fadeIn(100)
                }
            }
            return path
        })
    } else {
        if (!isNullOrUndefined(label)) {
            $(label).text(folder)
            $(label).fadeIn(100)
        }
    }
}

/** Retrieves a file path using a user dialog */
function getFile(title = 'Select File', label?: string, setconfig?: string, extensions?: object[], file?: string) {
    if (isNullOrUndefined(file)) {
        dialog.showOpenDialog({
            title: title,
            filters: extensions,
            properties: ['openFile']
        }, (path) => {
            if (isArray(path))
                path = path[0]
            
            if (!isNullOrUndefined(setconfig)) storage.set(setconfig, path)

            if (!isNullOrUndefined(label)) {
                if (path === '' || path === undefined)
                    $(label).fadeOut(100)
                else {
                    $(label).text(path)
                    $(label).fadeIn(100)
                }
            }
            return path
        })
    } else {
        if (!isNullOrUndefined(label)) {
            $(label).text(file)
            $(label).fadeIn(100)
        }
    }
}

function loadSetup() {
    let setup = storage.get('tease.setup')
    if (isBoolean(setup['saveload']))
        $('#saveSetup').prop('checked', setup['saveload'])
    if (isString(setup['imagefolder']))
        getFolder(undefined, '#selectImageFolderLabel', undefined, setup['imagefolder'])
    if (isNumber(setup['imagecount'])) {
        $('#pictureAmount').val(setup['imagecount'])
        $('#pictureAmount').find('.mdc-floating-label').addClass('mdc-floating-label--float-above')
    }
    if (isNumber(setup['slidetime']))
        $('#slideTime').val(setup['slidetime'])
    if (isBoolean(setup['enableticker']))
        $('#enableTicker').prop('checked', setup['enableticker'])
    if (isString(setup['tickersound'])) {
        $('#tickerSound option[value="' + setup['tickersound'] + '"]').prop('selected', true).siblings().prop('selected', false)
        if (setup['tickersound'] === 'custom') {
            $('#selectCustomTickerContainer').show()
            if (typeof setup['customticker'] === 'string')
                getFile(undefined, '#selectCustomTickerLabel', undefined, undefined, setup['customticker'])
        }
    }
    if (isBoolean(setup['announcecard']))
        $('#announceCard').prop('checked', setup['announcecard'])
    if (isBoolean(setup['announceimage']))
        $('#announceImage').prop('checked', setup['announceimage'])
    if (isString(setup['cardfolder']))
        getFolder(undefined, '#selectCardFolderLabel', undefined, setup['cardfolder'])
    if (isString(setup['cardmode'])) {
        $('#cardModeSelection option[value="' + setup['cardmode'] + '"]').prop('selected', true).siblings().prop('selected', false)
        $('#cardModeSelection').val(setup['cardmode'])
        $('#cardModeSelection').change()
    }
    if (isString(setup['premade']))
        getFile(undefined, '#selectPremadeDeckLabel', undefined, undefined, setup['premade'])
    if (isString(setup['goal']))
        $('#teaseGoalSelection').val(setup['goal'])
    if (isNumber(setup['goalx']))
        $('#teaseGoalX').val(setup['goalx'])
    if (isBoolean(setup['infinite']))
        $('#infiniteTease').prop('checked', setup['infinite'])
    if (isBoolean(setup['blockexit']))
        $('#teaseGoalQuitBlock').prop('checked', setup['blockexit'])
    if (isBoolean(setup['recurseimagefolder']))
        $('#recurseImage').prop('checked', setup['recurseimagefolder'])

    document.querySelectorAll('.mdc-text-field__input').forEach((el) => {
        if ($(el).val() !== '')
            $(el).siblings('.mdc-floating-label').addClass('.mdc-floating-label--float-above')
    })
}

function reportError(text: string, appendTo?: string) {
    let id = (new Date).getTime().toString()
    let object = `<div id="error-${id}" class="box mdc-theme--secondary-bg">
        <h1 class="mdc-typography--body1">
            ${text}&nbsp;
            <span class="material-icons" style="float: right; cursor: pointer;" onclick="$('#error-${id}').remove()">close</span>
        </h1>
    </div>`
    if (isNullOrUndefined(appendTo))
        $(object).attr('style', 'position:fixed;top:34;').prependTo('#swapper')
    else 
        $(object).appendTo(appendTo)
}

function saveSetup() {
    storage.set('tease.setup.saveload', ($('#saveSetup').prop('checked') || false))
    if (isString($('#pictureAmount').val()) && $('#pictureAmount').val() !== "")
        storage.set('tease.setup.imagecount', parseInt($('#pictureAmount').val().toString(), 10))
    else
        storage.set('tease.setup.imagecount', 0)
    if (isString($('#slideTime').val()) && $('#slideTime').val() !== "")
        storage.set('tease.setup.slidetime', parseInt($('#slideTime').val().toString(), 10))
    else
        storage.set('tease.setup.slidetime', 10)
    storage.set('tease.setup.enableticker', ($('#enableTicker').prop('checked') || true))
    storage.set('tease.setup.tickersound', $('#tickerSound').val() || 'default')
    storage.set('tease.setup.announcecard', ($('#announceCard').prop('checked') || false))
    storage.set('tease.setup.announceimage', ($('#announceImage').prop('checked') || false))
    storage.set('tease.setup.cardmode', $('#cardModeSelection').val())
    storage.set('tease.setup.goal', $('#teaseGoalSelection').val())
    storage.set('tease.setup.goalx', parseInt($('#teaseGoalX').val().toString(), 10))
    storage.set('tease.setup.infinite', $('#infiniteTease').prop('checked'))
    storage.set('tease.setup.blockexit', $('#teaseGoalQuitBlock').prop('checked'))
    storage.set('tease.setup.recurseimagefolder', $('#recurseImage').prop('checked'))
}

// Setup page components
$(document).ready(() => {
    categories = new CategoryControl(storage.get('tease.setup.saveload') || undefined)

    // Setup select menus
    document.querySelectorAll('.mdc-select').forEach(el => {
        mdc.select.MDCSelect.attachTo(el)
        $(el).find('option').css('color', 'black')
    })

    // Setup text field
    document.querySelectorAll('.mdc-text-field').forEach(el => {
        mdc.textField.MDCTextField.attachTo(el)
    })
    
    // Setup button ripples
    document.querySelectorAll('.mdc-button, .mdc-fab').forEach(el => {
        mdc.ripple.MDCRipple.attachTo(el)
    })

    // Setup folder buttons
    $('#selectImageFolder').click(() => getFolder('Select Image Folder', '#selectImageFolderLabel', 'tease.setup.imagefolder'))
    $('#selectCustomTicker').click(() => getFile('Select Ticker File', '#selectCustomTickerLabel', 'tease.setup.customticker', [{name: 'Audio Files', extensions: ['mp3', 'm4a', 'ogg', 'wav', 'wma']}]))
    $('#selectCardFolder').click(() => getFolder('Select Cards Folder', '#selectCardFolderLabel', 'tease.setup.cardfolder'))
    $('#selectPremadeDeck').click(() => getFile('Select Deck File', '#selectPremadeDeckLabel', 'tease.setup.premade', [{name: 'Deck', extensions: ['deck']}]))

    // Setup ticker selection
    $('#tickerSound').change(() => {
        let value = $('#tickerSound').val()
        if (value === 'custom')
            $('#selectCustomTickerContainer').slideDown(200)
        else
            $('#selectCustomTickerContainer').slideUp(200)
    })

    // Setup saveload checkbox
    $('#saveSetup').click(() => saveSetup())

    // Setup card-mode switching
    $('#cardModeSelection').change(() => {
        $('#cardMode').children(':visible').slideUp(200)
        $('#cardMode-' + $('#cardModeSelection').val()).slideDown(200)
        if ($('#cardModeSelection').val() == 'premade')
            $('#teaseGoalSetup').slideUp(200)
        else
            $('#teaseGoalSetup').slideDown(200)
        if ($('#cardModeSelection').val() == 'none' || $('#cardModeSelection').val() == 'premade')
            $('#addCategory, #resetCategories').prop('disabled', true).addClass('mdc-button--disabled')
        else
            $('#addCategory, #resetCategories').prop('disabled', false).removeClass('.mdc-button--disabled')
    })

    // Setup teaseGoal switching
    $('#teaseGoalSelection').click(() => {
        switch ($('#teaseGoalSelection').val()) {
            case 'end':
                $('#teaseGoalXContainer, #infiniteTeaseContainer').slideUp(200)
                break
            case 'cum':
            case 'minutes':
                $('#teaseGoalXContainer, #infiniteTeaseContainer').slideDown(200)
                break
            case 'release':
                $('#teaseGoalXContainer').slideUp(200)
                $('#infiniteTeaseContainer').slideDown(200)
        }
    })

    // Load settings if allowed
    if (storage.get('tease.setup.saveload'))
        loadSetup()

    // Setup add category button
    $('#addCategory').click(() => {
        if ($('#addCategory').prop('disabled') != true)
            categories.add('New Category')
    })

    // Setup default categories button
    $('#resetCategories').click(() => {
        if ($('#resetCategory').prop('disabled') != true) {
            categories.clear(true)
            let defaults = ['Stroke It', 'Bondage', 'Rough Mistress', 'Delusional', 'Nice Mistress', 'Dilemma',
                'Chance to Cum', 'Getting into Character', 'Special', 'Humiliation', 'Chastity Belt', 'Mind Control',
                'Key', 'Work It', 'Edge', 'Time Lapse']
            defaults.forEach((cat) => {
                categories.add(cat)
            })
        }
    })

    // Setup tease start button
    $('#startTease').click(() => {
        if ($('#pictureAmount').val() == "0" || $('#pictureAmount').val() == "")
            reportError('You haven\'t set an amount of pictures.', '#pictureSetup')
        else if ($('#cardModeSelection').val() == 'none')
            reportError('Select a card mode.', '#cardModeSelectionContainer')
        else if ($('#cardModeSelection').val() != 'premade' && categories.length <= 0)
            reportError('You have no card categories set up.', '#cardModeSelectionContainer')
        else {
            saveSetup()
            categories.save()

            let dialog = new mdc.dialog.MDCDialog($('#tease-cover-dialog')[0])
            dialog.escapeKeyAction = ''
            dialog.scrimClickAction = ''
            dialog.open()

            var window = new BrowserWindow({
                backgroundColor: '#000000',
                frame: false,
                height: 600,
                show: false,
                width: 800
            })
            $('#force-close-tease').on('click', () => window.close())
            window.loadURL(`file://${__dirname}/html/tease.html`)
            window.setFullScreen(true)
            globalShortcut.register('CommandOrControl+Shift+Y', () => window.webContents.toggleDevTools())
            window.once('ready-to-show', () => window.show())
            window.on('close', () => {
                globalShortcut.unregister('CommandOrControl+Shift+Y')
                swapper.swap('teaseend')
            })
        }
    })
})