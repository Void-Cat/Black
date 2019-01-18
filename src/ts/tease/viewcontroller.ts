declare const mdc, storage, theme
import { isNullOrUndefined, isBoolean } from 'util'
import ActionController from './actioncontroller'
import ExitController from './exitcontroller'
import ImageController from './imagecontroller'
import StrokingController from './strokingcontroller'
import TeaseEvent from './teaseEvent'
import * as path from 'path'

export default class ViewController {
    buffer: HTMLImageElement
    noBroadcast: number[] = []
    actionController: ActionController
    announcer = {
        card: new Audio(),
        image: new Audio()
    }
    exitController: ExitController
    imageController: ImageController
    strokingController: StrokingController
    snackbarElement = new mdc.snackbar.MDCSnackbar(document.querySelector('.mdc-snackbar'))
    index: number = -1
    viewID: string

    constructor(imageController: ImageController, exitController: ExitController, viewID: string) {
        this.imageController = imageController
        this.exitController = exitController

        this.buffer = new Image()

        if ($('img' + viewID).length == 0)
            throw new Error(`Could not find element '${viewID}' as View Element.`)
        else
            this.viewID = 'img' + viewID

        if (storage.get('tease.setup.announcecard')) {
            this.announcer.card.src = `local:///${__dirname}/../../audio/card.ogg`
        }
        if (storage.get('tease.setup.announceimage')) {
            this.announcer.image.src = `local:///${__dirname}/../../audio/slidechange.ogg`
        }
        this.snackbarElement.closeOnEscape = false
    }

    public nextSlide() {
        if (this.index + 20 < this.imageController.length && this.imageController.unending) {
            this.imageController.extend()
            this.nextSlide()
        } else if (this.index + 1 < this.imageController.length) {
            this.index++
            $(this.viewID).attr('src', this.buffer.src)
            if (!isNullOrUndefined(this.strokingController))
                this.strokingController.slidetiming = 0
            this.broadcastSlide()
            if (this.index + 1 < this.imageController.length)
                this.buffer.src = this.imageController.images[this.index + 1]
        } else {
            this.snackbar('Reached the end of the tease. Tease will close automatically.')
            this.exitController.exitTease('teaseend')
        }
    }

    broadcastSlide(runaction: boolean = true, rundelay: boolean = true) : void {
        $('#info-slide > td').text(this.index + 1)
        $('#imagePath').text(this.imageController.images[this.index])
        
        if (rundelay)
            this.actionController.delay()
        
        if (!runaction) {
            console.info(`<!> Broadcast of index ${this.index}. Runaction is false.`)
            this.announcer.image.play()
            return
        }
        let info = this.imageController.cil[this.index]
        if (isNullOrUndefined(info)) {
            console.debug(`<!> Broadcast of index ${this.index}; is picture`)
            $('#slideInfo').text('Picture')
            this.actionController.exec(new TeaseEvent('picture', undefined, 'view'))
            this.announcer.image.play()
        } else if (info.ignored) {
            console.debug(`<!> Broadcast of index ${this.index}; is ignored cared`)
            $('#slideInfo').text(`Card - ${this.imageController.categories[info['category']].name} (IGNORED)`)
            this.imageController.cil[this.index].ignored = false
            this.snackbar('This card is ignored.')
            this.announcer.image.play()
            this.noBroadcast.push(this.index)
        } else if (this.noBroadcast.indexOf(this.index) == -1) {
            console.debug(`<!> Broadcast of index ${this.index}; is card`)
            $('#slideInfo').text(`Card - ${this.imageController.categories[info['category']].name}`)
            this.noBroadcast.push(this.index)
            this.announcer.card.play()
            let ctis = this.imageController.cards[info['cardindex']]
            console.debug(`Found card at index ${this.index}:\n`, ctis)
            let catname = this.imageController.categories[info['category']].name
            this.actionController.exec(new TeaseEvent('instruction', catname, 'view'))
            let instant = false
            ctis.actions.forEach((action) => {
                this.actionController.push(action, true)
                if (action.data.fors.type === 'instant' && action.data.delay > 0)
                    instant = true
            })
            if (instant)
                this.actionController.exec(new TeaseEvent('instant', undefined, 'view'))
        } else {
            console.debug(`<!> Broadcast of index ${this.index}; is nobroadcast`)
            $('#slideInfo').text(`Card - ${this.imageController.categories[info['category']].name} (NO BROADCAST)`)
        }
    }

    public clearNoBroadcast(fromSlide: number, toSlide?: number) {
        let mod = 1

        if (toSlide === null || toSlide === undefined)
            toSlide = this.index
        else if (toSlide === -1 && this.noBroadcast.indexOf(fromSlide) !== -1) {
            this.noBroadcast.splice(this.noBroadcast.indexOf(fromSlide), 1)
            return
        } else if (toSlide === -1)
            return

        if (fromSlide > toSlide)
            mod = -1
        
        for (let i = fromSlide; i !== toSlide; i += mod) {
            if (this.noBroadcast.indexOf(i) !== -1)
                this.noBroadcast.splice(this.noBroadcast.indexOf(i), 1)
        }
    }

    public previousSlide() {
        if (this.index - 1 >= 0) {
            this.index--
            $(this.viewID).attr('src', this.imageController.images[this.index])
            if (this.index + 1 < this.imageController.length)
                this.buffer.src = this.imageController.images[this.index + 1]
        } else console.warn('[ViewController/previousSlide] Tried to switch to slide with index below 0.')
    }

    public jumpSlide(n: number, broadcast: boolean = true, delay: boolean = true) {
        if (n > this.imageController.length && this.imageController.unending)
            this.imageController.extend(n)
        if (n < this.imageController.length && n >= 0) {
            broadcast = ((n > this.index) && broadcast)
            this.index = n;
            $(this.viewID).attr('src', this.imageController.images[n])
            if (this.strokingController !== null && this.strokingController !== undefined)
                this.strokingController.slidetiming = 0
            this.broadcastSlide(broadcast, delay)
            if (this.index + 1 < this.imageController.length)
                this.buffer.src = this.imageController.images[this.index + 1]
        } else console.warn(`[ViewController/jumpSlide] Tried to jump to slide ${n}, but was out of bounds.`)
    }

    private snackbarQueue = []
    private snackbarQueueRunning = false
    private runSnackbarQueue() : void {
        this.snackbarQueueRunning = true

        if (!this.snackbarElement.isOpen && this.snackbarQueue.length > 0) {
            let item = this.snackbarQueue.shift()
            
            this.snackbarElement.labelText = item.message
            if (typeof item.buttonText === 'string' && item.buttonAction != null) {
                this.snackbarElement.actionButtonText = item.buttonText
                $('.mdc-snackbar__action').click(item.buttonAction)
                $('.mdc-snackbar__actions').show()
            } else $('.mdc-snackbar__actions').hide()
            if (item.stacked)
                $('.mdc-snackbar').addClass('mdc-snackbar--stacked')
            else
                $('.mdc-snackbar').removeClass('mdc-snackbar--stacked')

            this.snackbarElement.open()
            setTimeout(() => this.runSnackbarQueue(), this.snackbarElement.timeoutMs + 500)
        } else if (this.snackbarQueue.length == 0) this.snackbarQueueRunning = false
    }

    public snackbar(message: string, buttonText?: string, buttonAction?: Function, stacked: boolean = false) {
        this.snackbarQueue.push({
            message: message,
            buttonText: buttonText,
            buttonAction: buttonAction,
            stacked: stacked
        })
        if (!this.snackbarQueueRunning)
            this.runSnackbarQueue()
    }

    public info = {
        nextSlideTime: (now: boolean = false) => {
            if (now) {
                $('#info-slidetime > td').text(`${this.strokingController.slidetime}`)
                this.info.old.slideTime = this.strokingController.slidetime.toString()
            } else
                $('#info-strokes > td').text(`${this.info.old.slideTime} (${this.strokingController.slidetime})`)
        },
        nextStrokeCount: (now: boolean = false) => {
            if (now) {
                $('#info-strokes > td').text(`${this.strokingController.strokerate}`)
                this.info.old.strokeCount = this.strokingController.strokerate.toString()
            } else
                $('#info-strokes > td').text(`${this.info.old.strokeCount} (${this.strokingController.strokerate})`)
        },
        old: {
            slideTime: null,
            strokeCount: null
        }
    }

    public instructions = {
        _counter: 0,
        _raw: {},
        add: (id: number, desc: string) : number => {
            $('#info-instructions').append(`<span class="mdc-typography--body2" instruction-id="${id}">${desc}<br></span>`)
            $('#info-instructions').slideDown(200)
            this.instructions._raw[id] = {id: id, desc: desc, element: $(`#info-instructions > [instruction-id="${id}"]`)}
            return id
        },
        remove: (id: number) : void => {
            $(this.instructions._raw[id].element).remove()
            delete this.instructions._raw[id]
            if (Object.keys(this.instructions._raw).length == 0)
                $('#info-instructions').slideUp(200)
        }
    }

    public items = {
        _chastity: -1,
        _counter: {},
        _dialog: new mdc.dialog.MDCDialog($('#key-use')[0]),
        _dialogItem: (id: number, name: string, bodypart: string) : string => {
            let string = `<li class="mdc-list-item" key-use="${id.toString()}" role="option">
                <span class="mdc-list-item__text">
                    <span class="mdc-list-item__primary-text">${name}</span>
                    <span class="mdc-list-item__secondary-text">${bodypart}</span>
                </span>
            </li>`
            return string
        },
        _dialogList: new mdc.list.MDCList($('#key-use-list')[0]),
        _keyUseTarget: -2,
        _map: {},
        add: (id: number, item: string, bodypart: string) => {
            bodypart = bodypart.toLowerCase()
            this.items._map[id] = {id: id, item: item, bodypart: bodypart}
            if (isNullOrUndefined(this.items._counter[bodypart])) {
                this.items._counter[bodypart] = []
                $('#info-items').append(`<div class="item-bodypart" item-bodypart="${bodypart}"><h1 class="mdc-typography--subtitle2" style="margin-bottom: 0;">${bodypart[0].toUpperCase() + bodypart.substr(1)}</h1><div class="item-container mdc-typography--body2" style="margin-left: 3px;" item-bodypart="${bodypart}"></div></div>`)
            }
            this.items._counter[bodypart].push(id)
            $(`.item-container[item-bodypart="${bodypart}"]`).append(`<span item-id="${id}">${item[0].toUpperCase() + item.substr(1).toLowerCase()}<br></span>`)
        },
        chastity: (actionId: number, remove: boolean = false) => {
            if (this.items._chastity !== -1 && this.actionController.actions.raw[actionId] != null)
                this.actionController.remove(this.items._chastity)
            this.items._chastity = -1
            this.strokingController.chastity(!remove)
            this.items.remove(-1, true)
            if (!remove) {
                this.items._chastity = actionId
                this.items.add(-1, 'Chastity Device', 'chastity')
            }
        },
        keys: 0,
        modKeys: (n?: number) => {
            if (n === null || n === undefined)
                n = 1

            let newkeys = this.items.keys + n
            if (newkeys < 0)
                newkeys = 0

            this.items.keys = newkeys
            $('#info-keys').text(this.items.keys)
            $('#info-keys').parent().prop('disabled', (this.items.keys === 0))
        },
        remove: (id: number, supressWarning: boolean = false) => {
            let map = this.items._map[id]
            if (isNullOrUndefined(map)) {
                if (!supressWarning)
                    console.warn(`[ViewController/items] Tried to remove item with id ${id}, which wasn't found.`)
                return
            }
            delete this.items._map[id]
            this.items._counter[map.bodypart].splice(this.items._counter[map.bodypart].indexOf(map.id), 1)
            $('#info-items').find(`span[item-id="${id}"]`).remove()
            if (this.items._counter[map.bodypart].length == 0)
                $('#info-items').children(`.item-bodypart[item-bodypart="${map.bodypart}"]`).slideUp(200)
        },
        useKey: (force: boolean = false) => {
            if (this.items.keys > 0 || force) {
                // Prepare the List
                let itemList = $('#key-use-list')[0]
                $(itemList).empty()
                if (Object.keys(this.items._map).length > 0) {
                    Object.keys(this.items._map).forEach((key: string) => {
                        let item = this.items._map[key]
                        $(itemList).append(this.items._dialogItem(item.id, item.item, item.bodypart))
                    })
                    $('#key-use-noitems').hide()
                } else $('#key-use-noitems').show()
                this.items._dialogList = new mdc.list.MDCList(itemList)
                this.items._dialogList.singleSelection = true
                this.items._keyUseTarget = -2

                $('[key-use]').on('click', (e) => {
                    let id = parseInt($(e.currentTarget).attr('key-use'), 10)
                    this.items._keyUseTarget = id
                    $('#key-use-button').prop('disabled', false)
                })

                $('#key-use-button').on('click', () => {
                    if (this.items.keys > 0 && !$('#key-use-button').prop('disabled') && this.items._keyUseTarget !== -2 && !isNaN(this.items._keyUseTarget)) {
                        $('[key-use]').off('click')
                        $('#key-use-button').off('click')
                        $('#key-use-button').prop('disabled')
                        this.items.modKeys(-1)
                        if (this.items._keyUseTarget === -1)
                            this.items.chastity(this.items._chastity, true)
                        else
                            this.items.remove(this.items._keyUseTarget)
                        this.items._dialog.close()
                        this.actionController.exec(new TeaseEvent('key', undefined, 'keyuse'))
                    }
                })

                // Show the List
                this.items._dialog.open()
            }
        }
    }

    public mood = {
        _icons: ['thumb_down', 'thumbs_up_down', 'thumb_up'],
        _update: () => {
            let icon = this.mood._icons[this.mood.state + 1]
            $('#info-mood').text(icon)
        },
        better: () => {
            if (this.mood.state < 1) {
                this.mood.state += 1
                this.mood._update()
            }
        },
        state: 0,
        worse: () => {
            if (this.mood.state > -1) {
                this.mood.state -= 1
                this.mood._update()
            }
        }
    }

    public supermode = {
        _active: false,
        _audio: new Audio(`${__dirname}/../../audio/supermode.ogg`),
        _interval: null,
        _theme: 0,
        _timeout: null,
        end: () => {
            this.supermode._active = false
            $('body').removeClass('supermode')
            this.actionController.exec(new TeaseEvent('supermode', 'end', 'supermode'))
            this.supermode._audio.pause()
            this.supermode._audio.currentTime = 0
            clearInterval(this.supermode._interval)
            theme.setTheme(this.supermode._theme)
            this.strokingController.mute(false)
        },
        start: () => {
            this.supermode._audio.volume = 0.45
            this.supermode._active = true
            this.supermode._theme = theme.getTheme()
            setTimeout(() => {
                $('body').addClass('supermode')
                this.supermode._interval = setInterval(() => {
                    $('#tease-menu-changetheme').trigger('click')
                }, 1400)
            }, 16500)
            this.strokingController.mute(true)
            this.supermode._audio.play()
            this.supermode._timeout = setTimeout(() => this.supermode.end(), 184000)
            this.actionController.exec(new TeaseEvent('supermode', 'start', 'supermode'))
        }
    }
}