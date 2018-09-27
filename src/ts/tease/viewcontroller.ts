class ViewController {
    buffer: HTMLImageElement
    noBroadcast: number[] = []
    actionController: ActionController
    exitController: ExitController
    imageController: ImageController
    strokingController: StrokingController
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
        console.debug(`<!> Broadcast of index ${index}.`)
        $('#info-slide > td').text(index)
        if (!runaction)
            return
        let info = this.imageController.cil[index]
        if (isNullOrUndefined(info)) {
            console.debug('  > is image')
            this.actionController.exec(new TeaseEvent('image', undefined, 'view'))
        } else if (this.noBroadcast.indexOf(index) == -1) {
            console.debug('  > is card')
            this.noBroadcast.push(index)
            let ctis = this.imageController.cards[info['cardindex']]
            console.info(`Found card at index ${index}:\n`, ctis)
            let catname = this.imageController.categories[info['category']].name
            ctis.actions.forEach((action) => {
                this.actionController.push(action, true)
            })
            this.actionController.exec(new TeaseEvent('card', catname, 'view'))
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
}