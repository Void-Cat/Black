var Mousetrap = require('mousetrap')

class KeyController {
    exitController: ExitController
    keymap = {
        next: 'right',
        previous: 'left',
        pause: 'space',
        strokeup: 'up',
        strokedown: 'down',
        timeup: 'pageup',
        timedown: 'pagedown',
        exit: 'escape',
        mute: 'm'
    }
    viewController: ViewController
    strokingController: StrokingController

    constructor(exitController: ExitController, viewController: ViewController, strokingController: StrokingController) {
        this.exitController = exitController
        this.viewController = viewController
        this.strokingController = strokingController

        Object.assign(this.keymap, storage.get('settings.keymap'))

        this.bindkeys()
    }

    private bindkeys() : void {
        Mousetrap.bind(this.keymap['next'], () => this.viewController.nextSlide())
        Mousetrap.bind(this.keymap['previous'], () => this.viewController.previousSlide())
        Mousetrap.bind(this.keymap['pause'], () => this.strokingController.pause(null))
        Mousetrap.bind(this.keymap['strokeup'], () => this.strokingController.setStrokerate(1, '+'))
        Mousetrap.bind(this.keymap['strokedown'], () => this.strokingController.setStrokerate(1, '-'))
        Mousetrap.bind(this.keymap['timeup'], () => this.strokingController.setSlidetime(1, '+'))
        Mousetrap.bind(this.keymap['timedown'], () => this.strokingController.setSlidetime(1, '-'))
        Mousetrap.bind(this.keymap['exit'], () => this.exitController.exitTease('userexit'))
        Mousetrap.bind(this.keymap['mute'], () => this.strokingController.mute())
    }
}