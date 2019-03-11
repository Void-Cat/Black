declare const storage
import ViewController from './viewcontroller'
import * as fs from 'fs'
import {isNumber, isBoolean, isNull, isNullOrUndefined} from 'util'
var {app} = require('electron').remote

export default class StrokingController {
    carousel: HTMLAudioElement[] = []
    change: boolean = false
    chastised: boolean = false
    instantupdate: boolean = false
    interval = []
    muted: boolean = false
    paused: boolean = true
    slidetiming: number = 0
    slidetime: number
    strokerate: number
    viewController: ViewController

    constructor(viewController: ViewController) {
        this.viewController = viewController
        this.slidetime = this.strokerate = storage.get('tease.setup.slidetime')
        let audiosrc : string
        let prefix = (app.isPackaged ? 'local:///' : 'file:///')

        switch (storage.get('tease.setup.tickersound')) {
            case 'metronome':
                audiosrc = `${prefix}${__dirname}/../../audio/metronome.ogg`
                break

            case 'custom':
                audiosrc = `${prefix}${storage.get('tease.setup.customticker')}`
                break
            
            case 'default':
            default:
                audiosrc = `${prefix}${__dirname}/../../audio/ticker.ogg`
        }
        if (!fs.existsSync(audiosrc.substring(app.isPackaged ? 9 : 8)))
            throw new Error(`Ticker at source '${audiosrc}' could not be found.`)
        for (let i = 0; i < 6; i++) {
            this.carousel.push(new Audio())
            this.carousel[i].src = audiosrc
        }
    }

    init() {
        this.updateTicker(true)
        this.interval[1] = setInterval(() => this.slideTimeInterval(), 500)
        this.instantupdate = storage.get('settings.instanttickerupdate') || false
    }

    tickerInterval() {
        if (!this.paused) {
            this.carousel[0].play()
            this.carousel.push(this.carousel.shift())
        }
    }

    slideTimeInterval() {
        if (!this.paused)
            if (this.slidetiming >= this.slidetime) {
                this.viewController.nextSlide()
                this.slidetiming = 0
                this.updateTicker()
            } else
                this.slidetiming += 0.5
    }

    updateTicker(force: boolean = false) {
        if (this.change || force) {
            clearInterval(this.interval[0])
            let interval = this.slidetime * 1000 / this.strokerate
            this.interval[0] = setInterval(() => this.tickerInterval(), interval)
            this.change = false
        }
        this.viewController.info.nextStrokeCount(true)
        this.viewController.info.nextSlideTime(true)
    }

    /** Sets/Gets the strokerate
     * @param n desired strokerate, leave blank for getting
     * @param modifier modifier onto the current strokerate (+,-,/,*)
     */
    public setStrokerate(n?: number, modifier?: string) {
        if (typeof n === 'string')
            n = parseInt(n, 10)
        if (typeof n !== 'number' || isNaN(n)) {
            console.warn(`[StrokingController/setStrokerate] Tried to set strokerate to '${n}' with typeof '${typeof n}'.`)
            return this.strokerate
        }

        this.change = true

        switch(modifier) {
            case '+':
                this.strokerate += n
                break
            case '-':
                this.strokerate -= n
                break
            case '*':
                this.strokerate *= n
                break
            case '/':
                this.strokerate /= n
                break
            default:
            case '=':
                this.strokerate = n
        }
        
        if (this.strokerate < 0)
            this.strokerate = 0

        if (this.instantupdate)
            this.updateTicker()
        else
            this.viewController.info.nextStrokeCount()

        return this.strokerate
    }

    /** Sets/Gets the slidetime
     * @param n desired slidetime, leave blank for getting
     * @param modifier modifier onto the current slidetime (+,-,/,*)
     */
    public setSlidetime(n?: number, modifier?: string) {
        if (!isNumber(n))
            return this.slidetime
        
        this.change = true

        switch (modifier) {
            case '+':
                this.slidetime += n
                break
            case '-':
                this.slidetime -= n
                break
            case '*':
                this.slidetime *= n
                break
            case '/':
                this.slidetime /= n
                break
            default:
            case '=':
                this.slidetime = n
        }

        if (this.slidetime < 1)
            this.slidetime = 1
        if (this.instantupdate)
            this.updateTicker()
        else
            this.viewController.info.nextSlideTime()

        return this.slidetime
    }

    /** Pause/Unpause the tease. 
     * @param setting provides the setting, if null toggles the pause state, if undefined gets the pause state
    */
    public pause(setting?: boolean) : boolean {
        if (isBoolean(setting)) {
            this.paused = setting
            if (setting)
                $('#info-paused').show()
            else
                $('#info-paused').hide()
            return setting
        } else if (isNull(setting)) {
            this.paused = !this.paused
            $('#info-paused').toggle()
            return this.paused
        } else {
            return this.paused
        }
    }

    public mute(active?: boolean) {
        if (isNullOrUndefined(active))
            active = !this.muted
        
        if (!active && this.chastised)
            return

        this.muted = active
        
        this.carousel.forEach((audio) => {
            audio.muted = active
        })

        if (active)
            $('#info-muted').slideDown(100)
        else
            $('#info-muted').slideUp(100)
    }

    public chastity(active?: boolean) {
        if (isNullOrUndefined(active))
            active = !this.chastised
        
        this.chastised = active
        this.mute(active)
        
        if (active)
            $('#info-chastity').slideDown(100)
        else
            $('#info-chastity').slideUp(100)
    }
}