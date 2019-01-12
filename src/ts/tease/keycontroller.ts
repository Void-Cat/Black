declare const storage
const Mousetrap = require('mousetrap')
import ExitController from './exitcontroller'
import StrokingController from './strokingcontroller'
import ViewController from './viewcontroller'

(function(a){var b=a.prototype.stopCallback;a.prototype.stopCallback=function(a,c,d){return this.paused?!0:b.call(this,a,c,d)};a.prototype.pause=function(){this.paused=!0};a.prototype.unpause=function(){this.paused=!1};a.init()})(Mousetrap);

export default class KeyController {
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
    private paused: boolean = false
    viewController: ViewController
    strokingController: StrokingController

    constructor(exitController: ExitController, viewController: ViewController, strokingController: StrokingController) {
        this.exitController = exitController
        this.viewController = viewController
        this.strokingController = strokingController

        Object.assign(this.keymap, storage.get('settings.keymap'))

        this.bindkeys()
    }

    public pause(toggle?: boolean) : boolean {
        switch (toggle) {
            case null:
            case undefined:
                return this.pause(!this.paused)

            case true:
                this.paused = true
                Mousetrap.pause()
                return true
            
            case false:
                this.paused = false
                Mousetrap.unpause()
                return false
        }
    }

    public changeKey(mapping: string, key: string) {
        Mousetrap.reset()
        this.keymap[mapping] = key
        storage.set('settings.keymap', this.keymap)
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
        Mousetrap.bind(this.keymap['exit'], () => {
            if (!this.exitController.exitTease('userexit'))
                this.viewController.snackbar('A card is preventing you from quitting.')
        })
        Mousetrap.bind(this.keymap['mute'], () => this.strokingController.mute())
    }
}