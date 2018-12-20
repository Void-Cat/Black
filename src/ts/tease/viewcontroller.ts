declare const mdc
import { isNullOrUndefined, isBoolean } from 'util'
import ActionController from './actioncontroller'
import ExitController from './exitcontroller'
import ImageController from './imagecontroller'
import StrokingController from './strokingcontroller'
import TeaseEvent from './teaseEvent'

export default class ViewController {
    buffer: HTMLImageElement
    noBroadcast: number[] = []
    actionController: ActionController
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
            this.broadcastSlide(this.index)
            if (this.index + 1 < this.imageController.length)
                this.buffer.src = this.imageController.images[this.index + 1]
        } else {
            this.exitController.exitTease('teaseend')
        }
    }

    broadcastSlide(index: number, runaction = true) : void {
        console.info(`<!> Broadcast of index ${index}.`)
        $('#info-slide > td').text(index + 1)
        this.actionController.delay()
        if (!runaction)
            return
        let info = this.imageController.cil[index]
        if (isNullOrUndefined(info)) {
            console.debug('  > is picture')
            this.actionController.exec(new TeaseEvent('picture', undefined, 'view'))
        } else if (info.ignored) {
            console.debug('  > is ignored cared')
            this.imageController.cil[index].ignored = false
            this.snackbar('This card is ignored.')
            this.noBroadcast.push(index)
        } else if (this.noBroadcast.indexOf(index) == -1) {
            console.debug('  > is card')
            this.noBroadcast.push(index)
            let ctis = this.imageController.cards[info['cardindex']]
            console.debug(`Found card at index ${index}:\n`, ctis)
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
            console.debug('  > is nobroadcast')
        }
    }

    public clearNoBroadcast(slide: number) {
        for (let i = 0; i < this.noBroadcast.length; i++)
            if (this.noBroadcast[i] >= slide) {
                this.noBroadcast.splice(i, 1)
                i--;
            }
    }

    public previousSlide() {
        if (this.index - 1 >= 0) {
            this.index--
            $(this.viewID).attr('src', this.imageController.images[this.index])
            if (this.index + 1 < this.imageController.length)
                this.buffer.src = this.imageController.images[this.index + 1]
        } else console.warn('Tried to switch to slide with index below 0')
    }

    public jumpSlide(n: number) {
        if (n > this.imageController.length && this.imageController.unending)
            this.imageController.extend(n)
            // Some loading anim here?
        if (n < this.imageController.length && n >= 0) {
            let broadcast = false
            if (n > this.index)
                broadcast = true
            this.index = n;
            $(this.viewID).attr('src', this.imageController.images[n])
            if (this.index + 1 < this.imageController.length)
                this.buffer.src = this.imageController.images[this.index + 1]
            if (broadcast)
                this.broadcastSlide(this.index)
            else
                this.broadcastSlide(this.index, false)
        } else console.warn(`Tried to jump to slide ${n}, but was out of bounds.`)
    }

    public snackbar(message: string, multiLine = false, buttonText?: string, buttonAction?, buttonMultiLine?: boolean) {
        this.snackbarElement.show({
            actionHandler: buttonAction,
            actionOnBottom: buttonMultiLine,
            actionText: buttonText,
            message: message || 'No message provided.',
            multiline: (isBoolean(multiLine) ? multiLine : false)
        })
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
        _map: {},
        add: (id: number, item: string, bodypart: string) => {
            bodypart = bodypart.toLowerCase()
            this.items._map[id] = {id: id, item: item, bodypart: bodypart}
            if (isNullOrUndefined(this.items._counter[bodypart])) {
                this.items._counter[bodypart] = []
                $('#info-items').append(`<div class="item-bodypart" item-bodypart="${bodypart}"><h1 class="mdc-typography--subtitle2">${bodypart[0].toUpperCase() + bodypart.substr(1)}</h1><br><div class="item-container mdc-typography--body2" style="margin-left: 3px;" item-bodypart="${bodypart}"></div></div>`)
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
}