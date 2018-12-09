//var storage = new Storage();
declare var storage
import * as fs from 'fs'
import Action from './teaseAction'
import ActionController from './actioncontroller'
import ExitController from './exitcontroller'
import GoalController from './goalcontroller'
import ImageController from './imagecontroller'
import KeyController from './keycontroller'
import StrokingController from './strokingcontroller'
import ViewController from './viewcontroller'

var Globals = {
    categories: storage.get('teaseslave.teaseParams.categories'),
    ctisList: storage.get('teaseslave.ctisList') || {},
    fileList: storage.get('teaseslave.fileList') || [],
    icl: storage.get('teaseslave.icl') || {}
}

var categories: any = {
    matchName: (name: string) : boolean => {
        Object.keys(categories.raw).forEach((key) => {
            if (categories.raw[key].name.toLowerCase() == name.toLowerCase())
                return true
        })
        return false
    },
    raw: storage.get('tease.categories')
}

if (!storage.get('teaseslave.teaseParams.useRatios')) {
    Object.keys(Globals.categories).forEach(key => {
        if (Globals.categories[key].amount > 0) {
            let name = Globals.categories[key]['name']
            let count = Count(Values(Globals.icl), name.toLowerCase())
            Globals.categories[key].ratio = Math.round(count / Globals.icl.length * 100)
        } else Globals.categories[key].ratio = 0
    })
}

var ValidateValue = {
    Conditional: (value: string) => {
        return (['chastity', 'mood', 'nextinstruction', 'lastinstruction', 'slidetime', 'strokecount', 'sublevel'].indexOf(value) >= 0)
    },
    Event: (value: string[]) => {
        if (value[0] == 'type') value.shift()
        if (value.length == 1) {
            return (['instant', 'never', 'any', 'key', 'picture', 'end'].indexOf(value[0]) >= 0)
        }
        if (value.length == 2) {
            if (value[0] == 'cum')
                return (['any', 'full', 'ruin', 'edge'].indexOf(value[1]) >= 0)
            else if (value[0] == 'instruction')
                return (['any', 'mistress', 'master'].indexOf(value[1]) >= 0 || Values(Globals.icl).indexOf(value[1]) >= 0)
            else 
                return false
        }
    },
    Timing: (value: string) => {
        return (['instant', 'end', 'start'].indexOf(value) != -1)
    },
    Type: (value: string) => {
        return (['chastity', 'ctc', 'ctc:force', 'ignore', 'instruction', 'item', 'key', 'mood', 'on', 'position', 'setslide', 'skip', 'slidetime', 'stop', 'strokecount', 'sublevel'].indexOf(value) >= 0)
    }
}

function Count(obj: Array<any>, value: any) {
    if (obj[0] == null) return 0;
    let count = 0
    obj.forEach(el => {
        if (typeof el == 'string') el = el.toLowerCase()
        if (el == value) count++
    })
    return count;
}

// function retrieveFiles(path: string, recursive: boolean, pattern?: string) {
//     let files = []
//     fs.readdirSync(path, (err, files) => {
//         if (err) console.warn(err)
//         files.forEach(file => {
//             let stat = fs.lstatSync(path + '/' + file)
//             if ((stat.isDirectory() || stat.isSymbolicLink()) && recursive) {
//                 files = files.concat(retrieveFiles(path + '/' + file, true, pattern))
//             }
//         });
//     })
//     return files
// }

function Values(obj: object) {
    let ret = []
    for (let i in obj) {
        ret.push(obj[i])
    }
    return ret
}

// Class for keeping track of individual cards.
export class Card {
    // Variable keeping track of actions
    actions = []
    
    // Card centered data
    data = {
        index: 0
    }
    
    constructor(carddata: object, index: number) {    
        // Parse carddata to usable object if it's still in string form.
        if (typeof carddata == 'string') {
            carddata = JSON.parse(carddata)
        }
        
        this.data.index = index;
        
        // Make sure the card is properly parsed
        if (typeof carddata['actions'] != 'object') {
            console.warn('Failed to created actions from card at index ' + this.data.index)
            return undefined;
        }
        
        carddata['actions'].forEach(action => {
            this.actions.push(new Action(action, index))
        })
    }
}

export default class Tease {
    actionController: ActionController
    exitController: ExitController
    goalController: GoalController
    imageController: ImageController
    strokingController: StrokingController
    viewController: ViewController
    keyController: KeyController
    
    constructor() {
        this.imageController = new ImageController(0, (storage.get('tease.setup.infinite') || false))
        this.exitController = new ExitController(storage.get('tease.setup.blockexit'))
        this.goalController = new GoalController(storage.get('tease.setup.goal'), this.exitController, storage.get('tease.setup.goalx'))
        this.viewController = new ViewController(this.imageController, this.exitController, '#view')
        this.strokingController = new StrokingController(this.viewController)
        this.keyController = new KeyController(this.exitController, this.viewController, this.strokingController)
        this.actionController = new ActionController(this.imageController, this.goalController, this.strokingController, this.viewController, this.exitController)
        this.viewController.strokingController = this.strokingController
        this.viewController.actionController = this.actionController
        this.viewController.exitController = this.exitController

        if (this.imageController.startcards.length > 0) {
            this.imageController.startcards.forEach((index) => {
                let image = new Image()
                image.src = this.imageController.images[index]
                $('#startcards').append(image)
            })
            $('#startcards-container').slideDown(200)
        }
    }

    public start() : void {
        this.strokingController.init()
        this.viewController.jumpSlide(0)
        this.strokingController.pause(false)
        $('#preTease').hide()
        $('#tease').show()
    }
}