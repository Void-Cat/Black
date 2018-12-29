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
        this.exitController = new ExitController(!storage.get('tease.setup.blockexit'))
        this.viewController = new ViewController(this.imageController, this.exitController, '#view')
        this.goalController = new GoalController(storage.get('tease.setup.goal'), this.exitController, this.viewController, storage.get('tease.setup.goalx'))
        this.strokingController = new StrokingController(this.viewController)
        this.keyController = new KeyController(this.exitController, this.viewController, this.strokingController)
        this.actionController = new ActionController(this.imageController, this.goalController, this.strokingController, this.viewController, this.exitController)
        this.viewController.strokingController = this.strokingController
        this.viewController.actionController = this.actionController
        this.viewController.exitController = this.exitController
    }

    public ready() : void {
        if (this.imageController.startcards.length > 0) {
            this.imageController.startcards.forEach((index) => {
                let image = new Image()
                image.src = this.imageController.images[index]
                $('#startcards').append(image)
            })
            $('#startcards-container').slideDown(200)
        } else $('#no-startcards').slideDown(200)
    }

    public start() : void {
        this.imageController.startcards.forEach((index) => {
            let card : Card = this.imageController.cards[this.imageController.cil[index].cardindex]
            card.actions.forEach((action : Action) => {
                if (action.data.start === -1)
                    this.actionController.push(action, true)
            })
        })
        this.strokingController.init()
        this.viewController.jumpSlide(0)
        this.strokingController.pause(false)
        $('#preTease').hide()
        $('#tease').show()
    }

    public debug = {
        insertCard: (path: string, distance: number = 1) => {
            // Setup
            if (typeof path !== 'string')
                throw `Path should be a string. Given '${typeof path}'.`
            let insertIndex = this.viewController.index + distance

            // Generate the path from string
            path = storage.get('tease.setup.cardfolder') + '\\' + path

            // Create CTIS variable
            let ctis = {
                object: {}, // Object for storing the carddata later
                path: path.slice(0, path.lastIndexOf('.')) + '.ctis' // Path to the ctis card
            }

            // Check path and CTIS existance
            let exists = fs.existsSync(path) && fs.existsSync(ctis.path)
            if (!exists) throw `File not found: '${path}'.`
            
            // Get the CTIS object
            ctis.object = JSON.parse(fs.readFileSync(ctis.path, { encoding: 'utf8' }))
            
            // Find the category for the card
            let ctismatch : any[] = [-1, null]
            Object.keys(this.imageController.categories).forEach((key) => {
                let name = this.imageController.categories[key].name.toLowerCase()
                let match = path.toLowerCase().lastIndexOf(name)
                if (match > ctismatch[0])
                    ctismatch = [match, key]
            })

            // Check result
            if (ctismatch[1] == null)
                console.warn(`Card at path '${path}' couldn't be categorized.`)

            // Add to the image list
            this.imageController.images.splice(insertIndex, 0, path)

            // Move all the cil items over one
            for (let i = this.imageController.length - 1; i > insertIndex; i--) {
                if (this.imageController.cil[i] !== null && this.imageController.cil[i] !== undefined) {
                    this.imageController.cil[i + 1] = this.imageController.cil[i]
                    delete this.imageController.cil[i]
                }
            }

            // Add card to the cards list
            let cardIndex = this.imageController.cards.length
            this.imageController.cards.push(new Card(ctis.object, insertIndex))

            // Add to the cil list
            this.imageController.cil[insertIndex] = {
                category: ctismatch[1],
                cardindex: cardIndex
            }
            
            // Update image buffer if the next slide is the inserted card
            if (distance === 1)
                this.viewController.buffer.src = this.imageController.images[this.viewController.index + 1]

            // Report success
            console.log(`Succesfully inserted card with index ${insertIndex} (slide ${insertIndex + 1}).`)
        },
        pushAction: (data: object) => {
            let keys = Object.keys(data)
            
            if (!keys.includes('type') || !keys.includes('action'))
                console.debug(`[Tease/Debug] Can't create Action. Missing TYPE or ACTION parameter(s).`)

            data = Object.assign({
                start: 'draw',
                fors: 'instant',
                until: 'end'
            }, data)

            let action = new Action(data, this.viewController.index)
            this.actionController.push(action)
        },
        getImage: (index?: number) => {
            if (index === null || index === undefined)
                index = this.viewController.index

            if (typeof index === 'string')
                index = parseInt(index, 10)
            if (typeof index !== 'number')
                console.error('Index is NaN')

            console.log(`Image path:\n${this.imageController.images[index]}`)
        }
    }
}