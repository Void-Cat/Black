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
        this.imageController = new ImageController(0, (storage.get('tease.setup.infinite', false) && storage.get('tease.setup.goal', 'end') !== 'end'))
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
            
            if (keys.indexOf('type') === -1 || keys.indexOf('action') === -1)
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