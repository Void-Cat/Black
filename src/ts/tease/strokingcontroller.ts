class StrokingController {
    carousel: HTMLAudioElement[] = []
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
        let audiosrc = storage.get('tease.setup.tickersrc') || `${__dirname}/../audio/ticker.ogg`
        if (!fs.existsSync(audiosrc))
            throw new Error(`Ticker at source '${audiosrc}' could not be found.`)
        for (let i = 0; i < 6; i++) {
            this.carousel.push(new Audio())
            this.carousel[i].src = audiosrc
        }
        this.updateTicker()
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

    updateTicker(stash = true) {
        clearInterval(this.interval[0])
        let interval = this.slidetime * 1000 / this.strokerate
        this.interval[0] = setInterval(() => this.tickerInterval(), interval)
    }

    /** Sets/Gets the strokerate
     * @param n desired strokerate, leave blank for getting
     * @param modifier modifier onto the current strokerate (+,-,/,*)
     */
    public setStrokerate(n?: number, modifier?: string) {
        if (!isNumber(n))
            return this.strokerate

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

        return this.strokerate
    }

    /** Sets/Gets the slidetime
     * @param n desired slidetime, leave blank for getting
     * @param modifier modifier onto the current slidetime (+,-,/,*)
     */
    public setSlidetime(n?: number, modifier?: string) {
        if (!isNumber(n))
            return this.slidetime
        
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

        return this.slidetime
    }

    /** Pause/Unpause the tease. 
     * @param setting provides the setting, if null toggles the pause state, if undefined gets the pause state
    */
    //TODO: update interface to reflect pause
    public pause(setting?: boolean) : boolean {
        if (isBoolean(setting)) {
            this.paused = setting
            return setting
        } else if (isNull(setting)) {
            this.paused = !this.paused
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