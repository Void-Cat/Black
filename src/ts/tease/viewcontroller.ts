class ViewController {
    buffer: HTMLImageElement
    exitController: ExitController
    imageController: ImageController
    index: number = 0
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
            if (this.index + 1 < this.imageController.length)
                this.buffer.src = this.imageController.images[this.index + 1]
        } else {
            this.exitController.exitTease('teaseend')
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
            this.index = n;
            $(this.viewID).attr('src', this.imageController.images[n])
            if (this.index + 1 < this.imageController.length)
                this.buffer.src = this.imageController.images[this.index + 1]
        } else console.warn(`Tried to jump to slide ${n}, but was out of bounds.`)
    }
}