declare const storage, mdc
import ImageController from './imageController'
import StrokingController from './strokingController'
import ViewController from './viewcontroller'
import Action from './teaseAction'
import TeaseEvent from './teaseEvent'
import { isNullOrUndefined, isArray } from 'util'
import GoalController from './goalcontroller'
import ExitController from './exitcontroller'
import Tease, { Card } from './tease';

export default class ActionController {
    actions = {
        active: [],
        fors: {
            any: [],
            cum: {
                any: [],
                full: [],
                ruin: [],
                edge: []
            },
            instruction: {
                any: [],
                mistress: [],
                instruction: {}
            },
            key: [],
            picture: [],
            instant: []
        },
        until: {
            any: [],
            cum: {
                any: [],
                full: [],
                ruin: [],
                edge: []
            },
            instruction: {
                any: [],
                mistress: [],
                instruction: {}
            },
            key: [],
            picture: [],
            instant: [],
            end: []
        },
        delayed: {
            fors: {},
            until: {}
        },
        id: 0,
        inactive: [],
        raw: {}
    }
    exitController: ExitController
    goalController: GoalController
    imageController: ImageController
    mood: number = 0
    strokingController: StrokingController
    sublevel: number = storage.get('profile.sublevel')
    priority = {
        chastity: -1
    }
    viewController: ViewController

    constructor(imageController: ImageController, goalController: GoalController, strokingController: StrokingController, viewController: ViewController, exitController: ExitController) {
        this.imageController = imageController
        this.goalController = goalController
        this.strokingController = strokingController
        this.viewController = viewController
        this.exitController = exitController
    }

    public push(action: Action, active: boolean = true) : number {
        if (action.data.start === -1 && this.viewController.index > 0)
            return

        let id = this.actions.id++
        this.actions.raw[id] = action
        
        console.debug(`[ActionController/Push] Pushing new action '${id}' with FORS parameters:`, action.data.fors)
        switch (action.data.fors.type) {
            case 'key':
            case 'picture':
            case 'instant':
            case 'any':
                this.actions.fors[action.data.fors.type].push(id)
                break
            case 'cum':
                this.actions.fors.cum[action.data.fors.value[0]].push(id)
                break
            case 'instruction':
                let value = action.data.fors.value
                if (Array.isArray(value))
                    value = value[0]

                if (value == 'any')
                    this.actions.fors.instruction.any.push(id)
                else if (value == 'mistress')
                    this.actions.fors.instruction.mistress.push(id)
                else {
                    if (isNullOrUndefined(this.actions.fors.instruction.instruction[value]))
                        this.actions.fors.instruction.instruction[value] = [id]
                    else
                        this.actions.fors.instruction.instruction[value].push(id)
                }
                break
        }

        console.debug(`[ActionController/Push] Pushing '${id}' with UNTIL parameters:`, action.data.until)
        switch (action.data.until.type) {
            case 'end':
            case 'instant':
            case 'key':
            case 'picture':
            case 'any':
                this.actions.until[action.data.until.type].push(id)
                break
            case 'cum':
                this.actions.until.cum[action.data.until.value[0]].push(id)
                break
            case 'instruction':
                let value = action.data.until.value
                if (Array.isArray(value))
                    value = value[0]

                if (value == 'any')
                    this.actions.until.instruction.any.push(id)
                else if (value == 'mistress')
                    this.actions.until.instruction.mistress.push(id)
                else
                    if (isNullOrUndefined(this.actions.until.instruction.instruction[value]))
                        this.actions.until.instruction.instruction[value] = [id]
                    else
                        this.actions.until.instruction.instruction[value].push(id)
                break
        }

        if (active) {
            let delay = action.data.delay
            if (delay > 0)
                if (this.actions.delayed.fors[delay] === null || this.actions.delayed.fors[delay] === undefined)
                    this.actions.delayed.fors[delay] = [id]
                else
                    this.actions.delayed.fors[delay].push(id)
            else
                this.actions.active.push(id)
        }
        else
            this.actions.inactive.push(id)

        return id
    }

    public remove(id: number) {
        let action = this.actions.raw[id]
        let activeIndex = this.actions.active.indexOf(id)
        let inactiveIndex = this.actions.inactive.indexOf(id)

        console.debug(`[ActionController] Removing action with id '${id}'.\n`, action)
        
        // Remove from active/inactive lists
        if (activeIndex >= 0)
            this.actions.active.splice(activeIndex, 1)
        if (inactiveIndex >= 0)
            this.actions.inactive.splice(inactiveIndex, 1)

        // Remove from fors
        let forsIndex = -1
        switch (action.data.fors.type) {
            case 'key':
            case 'instant':
            case 'picture':
                forsIndex = this.actions.fors[action.data.fors.type].indexOf(id)
                if (forsIndex >= 0)
                    this.actions.fors[action.data.fors.type].splice(forsIndex, 1)
                break
            case 'cum':
                forsIndex = this.actions.fors.cum[action.data.fors.value[0]].indexOf(id)
                if (forsIndex >= 0)
                    this.actions.fors.cum[action.data.fors.value[0]].splice(forsIndex, 1)
                break
            case 'instruction':
                let value = action.data.fors.value
                if (value == 'any') {
                    forsIndex = this.actions.fors.instruction.any.indexOf(id)
                    this.actions.fors.instruction.any.splice(forsIndex, 1)
                } else if (value == 'mistress') {
                    forsIndex = this.actions.fors.instruction.mistress.indexOf(id)
                    this.actions.fors.instruction.mistress.splice(forsIndex, 1)
                } else
                    if (!isNullOrUndefined(this.actions.fors.instruction.instruction[value])) {
                        forsIndex = this.actions.fors.instruction.instruction[value].indexOf(id)
                        this.actions.fors.instruction.instruction[value].splice(forsIndex, 1)
                    }
                break
        }
        if ((forsIndex = this.actions.fors.any.indexOf(id)) != -1)
            this.actions.fors.any.splice(forsIndex, 1)

        // Remove from until
        let untilIndex = -1
        switch (action.data.until.type) {
            case 'key':
            case 'picture':
            case 'instant':
            case 'end':
                untilIndex = this.actions.until[action.data.until.type].indexOf(id)
                if (untilIndex >= 0)
                    this.actions.until[action.data.until.type].splice(untilIndex, 1)
                break
            case 'cum':
                untilIndex = this.actions.until.cum[action.data.until.value[0]].indexOf(id)
                if (untilIndex >= 0)
                    this.actions.until.cum[action.data.until.value[0]].splice(untilIndex, 1)
                break
            case 'instruction':
                let value = action.data.until.value
                if (value == 'any') {
                    untilIndex = this.actions.until.instruction.any.indexOf(id)
                    this.actions.until.instruction.any.splice(untilIndex, 1)
                } else if (value == 'mistress') {
                    untilIndex = this.actions.until.instruction.mistress.indexOf(id)
                    this.actions.until.instruction.mistress.splice(untilIndex, 1)
                } else if (!isNullOrUndefined(this.actions.until.instruction.instruction[value])) {
                    untilIndex = this.actions.until.instruction.instruction[value].indexOf(id)
                    this.actions.until.instruction.instruction[value].splice(untilIndex, 1)
                }
                break
        }
        if ((untilIndex = this.actions.until.any.indexOf(id)) != -1)
            this.actions.until.any.splice(untilIndex, 1)

        // Remove from delay
        Object.keys(this.actions.delayed.fors).forEach((d) => {
            let index = this.actions.delayed.fors[d].indexOf(id)
            if (index !== -1)
                this.actions.delayed.fors[d].splice(index, 1)
        })
        Object.keys(this.actions.delayed.until).forEach((d) => {
            let index = this.actions.delayed.until[d].indexOf(id)
            if (index !== -1)
                this.actions.delayed.until[d].splice(index, 1)
        })

        // Remove from raw
        delete this.actions.raw[id]

        // Add AFTER actions if any
        let after = action.data.after
        if (after.active === true) {
            let currentIndex = this.viewController.index
            after.actions.forEach((actiondata: object) => {
                this.push(new Action(actiondata, currentIndex), true)
            })
            this.exec(new TeaseEvent('instant', undefined, 'after'))
        }
    }

    public exec(event: TeaseEvent) {
        // Debug
        console.debug(`[ActionController] Exec was called. Event:`, event)

        // Start by getting cards that always fire
        let cards = this.actions.fors.any

        // Gather up eligable cards by FORS parameter
        switch (event.type) {
            case 'cum':
                cards = cards.concat(this.actions.fors.cum.any).concat(this.actions.fors.cum[event.value])
                break
            case 'key':
            case 'picture':
            case 'instant':
                cards = cards.concat(this.actions.fors[event.type])
                break
            case 'instruction':
                cards = cards.concat(this.actions.fors.instruction.any).concat(this.actions.fors.instruction.instruction[event.type])
                if (event.value.indexOf('mistress') !== -1 || event.value.indexOf('master') !== -1)
                    cards = cards.concat(this.actions.fors.instruction.mistress)
                break
        }
        // Filter eligible cards by looking wether or not they're currently active
        for (let i = 0; i < cards.length; i++) {
            if (this.actions.active.indexOf(cards[i]) == -1) {
                cards.splice(i, 1)
                i--
            }
        }

        // Filter any duplicates out of the list
        for (let i = 0; i < cards.length; i++) {
            while (i !== cards.lastIndexOf(cards[i])) {
                cards.splice(i, 1)
                i--
            }
        }

        // Make sure there's no priority conflicts
        cards = this.prioritize(cards)

        // Execute all remaining eligible cards (if they meet conditional)
        let instants = []
        cards.forEach((key) => {
            let action : Action = this.actions.raw[key]
            if (this.conditional(action, key)) {
                this.execByType[action.data.type](action, parseInt(key, 10))
                if (action.data.fors.type == 'instant')
                    instants.push(key)
            }
        })

        // Remove all run "instant" FORS parameter cards
        while (instants.length > 0) {
            let key = instants.pop()
            let index = [this.actions.fors.instant.indexOf(key), this.actions.fors.any.indexOf(key)]
            this.actions.fors.instant.splice(index[0], 1)
            this.actions.fors.any.splice(index[1], 1)
        }

        // Clean all cards by UNTIL
        cards = this.actions.until.any

        // Gather up eligable cleanup cards by UNTIL parameter
        switch (event.type) {
            case 'cum':
                cards = cards.concat(this.actions.until.cum.any).concat(this.actions.until.cum[event.value])
                break
            case 'key':
            case 'picture':
            case 'instant':
                cards = cards.concat(this.actions.until[event.type])
                break
            case 'instruction':
                cards = cards.concat(this.actions.until.instruction.any).concat(this.actions.until.instruction.instruction[event.type])
                if (event.value.indexOf('mistress') != -1 || event.value.indexOf('master') != -1)
                    cards = cards.concat(this.actions.until.instruction.mistress)
        }

        // Filter eligible cards by looking whether or not they're currently active
        for (let i = 0; i < cards.length; i++) {
            if (this.actions.active.indexOf(cards[i]) == -1) {
                cards.splice(i, 1)
                i--
            }
        }

        for (let i = 0; i < cards.length; i++) {
            // Filter cards to check if they need multiple UNTIL activations
            let action = this.actions.raw[cards[i]]
            let until = action.data.until
            if (typeof until.count === 'number')
                if (until.count > 1) {
                    if (!action.hasLive('until-count')) {
                        action.setLive('until-count', until.count - 1)
                        cards.splice(i, 1)
                        i--
                        continue
                    } else if (parseInt(action.getLive('until-count'), 10) > 0) {
                        action.setLive('until-count', parseInt(action.getLive('until-count'), 10) - 1)
                        cards.splice(i, 1)
                        i--
                        continue
                    }
                }
            // Filter cards to check if they're in the delayed UNTIL circle (and add them to it if they belong there)
            if (!isNullOrUndefined(until.delay))
                if (until.delay > 0) {
                    let live = action.getLive('until-delay')
                    if (typeof(live) == 'string')
                        live = (live == 'true' ? true : false)
                    
                    if (live) {
                        cards.splice(i, 1)
                        i--
                        continue
                    }
                    
                    if (isNullOrUndefined(this.actions.delayed.until[until.delay]))
                        this.actions.delayed.until[until.delay] = [cards[i]]
                    else
                        this.actions.delayed.until[until.delay].push(cards[i])
                    action.setLive('until-delay', true)
                    cards.splice(i, 1)
                    i--
                }
        }

        // Filter any duplicates out of the list
        for (let i = 0; i < cards.length; i++) {
            while (i !== cards.lastIndexOf(cards[i])) {
                cards.splice(i, 1)
                i--
            }
        }

        // Remove all remaining eligible cards
        cards.forEach((key) => {
            let action = this.actions.raw[key]
            if (isNullOrUndefined(action))
                console.warn(`[ActionController/Exec] Tried to remove missing action with id '${key}'`)
            else {
                if (action.data.clean && !action.data.flags.includes('no_clean') && action.data.until.type !== 'instant')
                    this.cleanup(action)
                this.remove(key)
            }
        })
    }

    public delay() {
        // Get the next generation
        let nextFors = this.actions.delayed.fors[1] || []
        let nextUntil = this.actions.delayed.until[1] || []

        // Process nextFors
        let instant = false
        nextFors.forEach((id: number) => {
            this.actions.active.push(id)
            if (this.actions.raw[id].data.fors.type === 'instant')
                instant = true
        })
        if (instant)
            this.exec(new TeaseEvent('instant', undefined, 'delay'))

        // Process nextUntil
        nextUntil.forEach((key: number) => {
            let action = this.actions.raw[key]
            if (action.data.clean)
                this.cleanup(action)
            this.remove(key)
        })

        // Create new delay for FORS
        let newFors = {}
        Object.keys(this.actions.delayed.fors).forEach((oldDelay) => {
            let newDelay = parseInt(oldDelay, 10) - 1
            if (newDelay >= 1)
                newFors[newDelay] = this.actions.delayed.fors[oldDelay]
        })

        // Create new delay for UNTIL
        let newUntil = {}
        Object.keys(this.actions.delayed.until).forEach((oldDelay) => {
            let newDelay = parseInt(oldDelay, 10) - 1
            if (newDelay >= 1)
                newUntil[newDelay] = this.actions.delayed.until[oldDelay]
        })

        // Set the new delays
        this.actions.delayed = {
            fors: newFors,
            until: newUntil
        }
    }

    conditional(action: Action, id: number, inforce?: boolean) : boolean {
        if (isNullOrUndefined(inforce) || inforce == false)
            if (action.data.conditional.force) {
                let result = this.conditional(action, id, true)
                if (result)
                    return true
                this.remove(id)
                return false
            }
        let conditional = action.data.conditional
        if (conditional.type == 'none')
            return true
        switch (conditional.type) {
            case 'chastity':
                if (conditional.value == 'true')
                    return this.strokingController.chastised
                else
                    return !this.strokingController.chastised
            case 'mood':
                if ((this.mood == 1 && conditional.value == 'good') ||
                    (this.mood == 0 && conditional.value == 'neutral') ||
                    (this.mood == -1 && conditional.value == 'bad'))
                    return true
                return false
            case 'nextinstruction':
                for (let i = this.viewController.index + 1; i < this.imageController.length; i++) {
                    if (!isNullOrUndefined(this.imageController.cil[i])) {
                        let cil = this.imageController.cil[i]
                        if (cil == conditional.value)
                            return true
                        else if (conditional.value == 'mistress' && cil.indexOf('mistress') != -1)
                            return true
                        else
                            return false
                    }
                }
                return false
            case 'previousinstruction':
                for (let i = this.viewController.index - 1; i >= 0; i--) {
                    if (!isNullOrUndefined(this.imageController.cil[i])) {
                        let cil = this.imageController.cil[i]
                        if (cil == conditional.value)
                            return true
                        else if (conditional.value == 'mistress' && cil.indexOf('mistress') != -1)
                            return true
                        else
                            return false
                    }
                }
                return false
            case 'slidetime':
            case 'strokecount':
            case 'sublevel':
                if (conditional.comparator == 'none')
                    conditional.comparator = '=='
                if (conditional.type == 'slidetime')
                    var cv : any = this.strokingController.slidetime
                else if (conditional.type == 'strokecount')
                    var cv : any = this.strokingController.strokerate
                else if (conditional.type == 'sublevel')
                    var cv : any = parseInt(storage.get('profile.sublevel'), 10)
                switch (conditional.comparator) {
                    case '==':
                        return (cv == conditional.value)
                    case '>':
                        return (cv > conditional.value)
                    case '<':
                        return (cv < conditional.value)
                    case '>=':
                        return (cv >= conditional.value)
                    case '<=':
                        return (cv <= conditional.value)
                    case '!=':
                        return (cv != conditional.value)
                }
                return false
        }
        return false
    }

    cleanup(action: Action) {
        console.debug(`[ActionController/CleanUp] Cleaning up card with type '${action.data.type}'.`)
        switch(action.data.type) {
            case 'chastity':
                if (action.data.action)
                    this.strokingController.chastity(false)
                break
            case 'ctc':
                this.goalController.ctcState(false)
                break
            case 'instruction':
                let instructionid = action.getLive('instruction-id')
                this.viewController.instructions.remove(instructionid)
                break
            case 'item':
                let itemid = action.getLive('item-id')
                this.viewController.items.remove(itemid)
                break
            case 'position':
                $('#info-position').text('Free')
                break
            case 'stop':
                let cuid = action.getLive('cu-id')
                if (!isNullOrUndefined(cuid))
                    this.exitController.removeCU(cuid)
        }
    }

    execByType = {
        chastity: (action: Action, id: number) => {
            if (action.data.action)
                this.viewController.items.chastity(id)
            else
                this.viewController.items.chastity(-1, true)
        },
        contact: (action: Action) => {
            let contact = action.data.action
            switch (contact.type) {
                case 'message':
                    this.contact.message(contact)
                    break
                case 'prompt':
                    this.contact.prompt(contact)
                    break
                case 'options':
                    this.contact.options(contact)
                    break
            }
        },
        ctc: (action: Action) => {
            let ctc = action.data.action
            if (['full', 'ruin', 'edge'].indexOf(ctc) !== -1)
                this.goalController.ctcState(ctc)
            else if (ctc === 'false')
                this.goalController.ctcState(false)
            else
                console.warn(`[ActionController/ExecByType/ctc] Action not recognized: ${action.data.action}.`)
        },
        ignore: (action: Action) => {
            let typeName = action.data.action.toLowerCase()
            let typeMatch : string[] = []

            Object.keys(this.imageController.categories).forEach((cat) => {
                let catName = this.imageController.categories[cat].name.toLowerCase()
                if (typeName === 'mistress' && catName.match(/(mistress|master)/gi).length > 0)
                    typeMatch.push(cat)
                
                if (typeName == catName)
                    typeMatch.push(cat)
            })

            let found = false
            for (let i = this.viewController.index; i < this.imageController.length; i++) {
                if (this.imageController.cil[i] !== null && this.imageController.cil[i] !== undefined)
                    if (typeMatch.indexOf(this.imageController.cil[i].category) !== -1) {
                        this.imageController.cil[i].ignored = true
                        found = true
                        break
                    }
            }
            if (!found)
                this.viewController.snackbar(`No future '${typeName}' card found to ignore.`)
        },
        instruction: (action: Action) => {
            let id = parseInt(action.data.index.toString() + Math.floor(Math.random() * 100).toString(), 10)
            this.viewController.instructions.add(id, action.data.action)
            action.setLive('instruction-id', id)
        },
        item: (action: Action) => {
            let id = parseInt(action.data.index.toString() + Math.floor(Math.random() * 100).toString(), 10)
            this.viewController.items.add(id, action.data.action.item, action.data.action.slot)
            action.setLive('item-id', id)
        },
        key: (action: Action) => {
            let amount = parseInt(action.data.action, 10)
            if (isNaN(amount))
                amount = 1
            this.viewController.items.modKeys(amount)
        },
        mood: (action: Action) => {
            if (action.data.action == 'good')
                this.viewController.mood.better()
            else if (action.data.action == 'bad')
                this.viewController.mood.worse()
            else
                console.warn(`[ActionController] Failed to recognize mood modifier '${action.data.action}'.`)
        },
        on: (action: Action) => {
            if (Array.isArray(action.data.action)) {
                action.data.action.forEach((localAction) => {
                    this.push(new Action(localAction, action.data.index), true)
                })
                this.exec(new TeaseEvent('instant', undefined, 'onaction'))
            } else if (action.data.action !== null && typeof action.data.action == 'object') {
                this.push(new Action(action.data.action, action.data.index), true)
                this.exec(new TeaseEvent('instant', undefined, 'onaction'))
            }
        },
        // Position needs work (id system)
        position: (action: Action) => {
            $('#info-position').text(action.data.action)
        },
        setslide: (action: Action) => {
            let mod = this.numbermod(this.viewController.index, action.data.action.modifier, parseInt(action.data.action.value, 10) - (action.data.delay > 0 ? 1 : 0))
            this.viewController.jumpSlide(mod, false, false)
        },
        slidetime: (action: Action) => {
            let timing = action.data.action
            if (Array.isArray(timing)) {
                let index = action.getLive('switch-index', 0)
                if (index >= timing.length)
                    index = 0
                action.setLive('switch-index', index + 1)
                timing = timing[index]
            }
            this.strokingController.setSlidetime(timing.value, timing.modifier)
        },
        strokecount: (action: Action) => {
            let count = action.data.action
            if (Array.isArray(count)) {
                let index = action.getLive('switch-index', 0)
                if (index >= count.length)
                    index = 0
                action.setLive('switch-index', index + 1)
                count = count[index]
            }
            this.strokingController.setStrokerate(count.value, count.modifier)
        },
        skip: (action: Action, id: number) => {
            let distance = action.data.action.distance
            let target = action.data.action.categoryName
            let traversed = 0
            let found = []
            let mod = (distance >= 0 ? 1 : -1)

            // Get the category key instead of it's name
            let foundKey = false
            Object.keys(this.imageController.categories).forEach((key) => {
                if (this.imageController.categories[key].name.toLowerCase() === target) {
                    target = key
                    foundKey = true
                }
            })
            if (!foundKey) {
                this.viewController.snackbar(`No card found to skip to.`)
                console.warn(`[ActionController/ExecByType] Tried to skip to unrecognized category '${target}'.`)
                return
            }

            for (var i = this.viewController.index + 1; i < this.imageController.length; i += mod) {
                if (this.imageController.cil[i] != null)
                    if (this.imageController.cil[i].category == target) {
                        found.push(i)
                        traversed += mod
                        if (traversed == distance)
                            break
                    }
            }

            console.debug(`[ActionController/ExecByType] Cards found:`, found)
            this.remove(id)

            if (traversed == 0)
                this.viewController.snackbar('No card found to skip to.')
            else if (traversed != distance) {
                this.viewController.snackbar(`Skipped as far as possible. (${traversed} cards)`)
                this.viewController.jumpSlide(found.pop(), false)
            } else {
                this.viewController.snackbar(`Skipped ${traversed} cards.`)
                this.viewController.jumpSlide(found.pop(), false)
            }
        },
        stop: (action: Action) => {
            let id = action.data.index + '-' + Math.floor(Math.random() * 100).toString()
            if (action.data.action == 'quit') {
                this.contact.message({
                    alert: 'warning',
                    id: id,
                    pause: true, 
                    text: 'Quitting the tease by card in 10 seconds.',
                    time: 10
                })
                this.exitController.exitTease('quitcard')
            }
            let priority = (action.data.priority <= 0 ? undefined : action.data.priority)
            action.setLive('cu-id', id)
            if (action.data.action == 'block')
                this.exitController.addCU(id, false, priority)
            else if (action.data.action == 'allow')
                this.exitController.addCU(id, true, priority)
        },
        sublevel: (action: Action) => {
            let sublevel = parseInt(storage.get('profile.sublevel'), 10)
            if (typeof sublevel !== 'number' || isNaN(sublevel))
                sublevel = 0
            sublevel = this.numbermod(sublevel, action.data.action.modifier, action.data.action.value)
            if (sublevel > 5)
                sublevel = 5
            else if (sublevel < -5)
                sublevel = -5
            storage.set('profile.sublevel', sublevel)
        }
    }

    contact = {
        _active: false,
        _dialog: new mdc.dialog.MDCDialog($('#contact-element')[0]),
        _element: {
            container: $('#contact-element')[0],
            dismiss: $('#contact-dismiss')[0],
            footer: {
                message: $('#contact-footer-message')[0],
                options: $('#contact-footer-options')[0],
                prompt: $('#contact-footer-prompt')[0]
            },
            icon: $('#contact-icon')[0],
            prompt: $('#contact-prompt')[0],
            submit: $('#contact-submit')[0],
            title: $('#contact-label')[0],
            text: $('#contact-description')[0]
        },
        _queue: [],
        _resolvePrompt: (answers: object, input: string) => {
            console.debug(`[ActionController/Contact] Resolving prompt with input '${input}'. Answers:`, answers)
            input = input.toLowerCase().trim()
            if (!isNullOrUndefined(answers['prompt:' + input])) {
                this.push(new Action(answers['prompt:' + input], this.viewController.index))
                this.exec(new TeaseEvent('instant', undefined, 'contact'))
            } else if (!isNullOrUndefined(answers['else'])) {
                this.push(new Action(answers['else'], this.viewController.index))
                this.exec(new TeaseEvent('instant', undefined, 'contact'))
            }
            if (!isNullOrUndefined(answers['carry'])) {
                let carry : any = JSON.stringify(answers['carry'])
                carry = carry.replace('//carry//', input)
                carry = JSON.parse(carry)
                this.push(new Action(carry, this.viewController.index))
                this.exec(new TeaseEvent('instant', undefined, 'contact'))
            }
        },
        _timeout: null,
        _timelimit: (item: object) => {
            console.info(`Timelimit on ${item['type']} expired.`)
            let element = this.contact._element

            this.contact._dialog.close()

            $(element.dismiss).off()
            if (this.contact._queue.length > 0)
                this.contact._work()
            else
                this.contact._active = false

            if (!isNullOrUndefined(item['timelimit'])) {
                this.push(new Action(item['timelimit'], this.viewController.index))
                this.exec(new TeaseEvent('instant', undefined, 'contact'))
            }

            if (this.contact._queue.length > 0)
                this.contact._work()
            else
                this.contact._active = false
        },
        _work: () => {
            let item = this.contact._queue.shift()
            let element = this.contact._element

            console.debug('[ActionController/Contact] Working through queue. Current item:', item)

            // Pre-1.7 users defined a color instead of an icon-state.
            if (!isNullOrUndefined(item.color)) {
                switch(item.color) {
                    case 'blue': item.alert = 'info'; break
                    case 'red': item.alert = 'error'; break
                    case 'yellow': item.alert = 'warning'; break
                    case 'green': item.alert = 'success'; break
                }
            }
            // 'Success' isn't an icon, but check_circle is.
            if (item.alert == 'success')
                item.alert = 'check_circle'

            // Prepare dialog text and icon elements.
            $(element.title).text(item.type[0].toUpperCase() + item.type.substr(1))
            $(element.text).text(item.text)
            $(element.icon).text(item.alert)

            if (item.pause === 'true')
                item.pause = true
            if (item.pause)
                this.strokingController.pause(true)

            let error = false
            // Set up type specific properties
            switch (item.type) {
                case 'message':
                    $(element.footer.message).show().siblings('footer').hide()
                    $(element.dismiss).click(() => {
                        $(element.dismiss).off()
                        this.contact._dialog.close()
                        clearTimeout(this.contact._timeout)
                        if (item.pause == 'true')
                            this.strokingController.pause(false)
                        if (this.contact._queue.length > 0)
                            this.contact._work()
                        else
                            this.contact._active = false
                    })
                    this.contact._dialog.scrimClickAction = 'close'
                    this.contact._dialog.escapeKeyAction = 'close'
                    break

                case 'prompt':
                    $(element.prompt).val('')
                    $(element.footer.prompt).show().siblings('footer').hide()
                    $(element.submit).click(() => {
                        $(element.submit).off()
                        this.contact._dialog.close()
                        clearTimeout(this.contact._timeout)
                        if (item.pause == 'true')
                            this.strokingController.pause(false)
                        this.contact._resolvePrompt(item.answer, $(element.prompt).val().toString())
                        if (this.contact._queue.length > 0)
                            this.contact._work()
                        else
                            this.contact._active = false
                    })
                    this.contact._dialog.scrimClickAction = ''
                    this.contact._dialog.escapeKeyAction = ''
                    break

                case 'options':
                    $(element.footer.options).empty().show().siblings('footer').hide()
                    if (Object.keys(item.options).length <= 0) {
                        console.warn('[ActionController/contact] Tried to create option dialog without any options.')
                        error = true
                    }
                    Object.keys(item.options).forEach((option) => {
                        $(element.footer.options).append(`<button class="mdc-button mdc-button--raised mdc-dialog__button" style="margin: 2px;" option="${option}">${option}</button>`)
                        $(`button[option="${option}"]`).on('click', () => {
                            this.push(new Action(item.options[option], this.viewController.index))
                            this.exec(new TeaseEvent('instant', undefined, 'contact'))
                        })
                    })
                    $(element.footer.options).children('button').click(() => {
                        $(element.footer.options).children('button').delay(10).off()
                        this.contact._dialog.close()
                        clearTimeout(this.contact._timeout)
                        if (item.pause == 'true')
                            this.strokingController.pause(false)
                        if (this.contact._queue.length > 0)
                            this.contact._work()
                        else
                            this.contact._active = false
                    })
                    this.contact._dialog.scrimClickAction = ''
                    this.contact._dialog.escapeKeyAction = ''
            }

            // Show the dialog
            if (!error) {
                this.contact._dialog.open()

                // Setup the timer for the dialog to automagically disappear
                if (!isNullOrUndefined(item.time) && item.time > 0) {
                    if (item.time < 1000)
                        item.time *= 1000
                    console.info(`Added timeout for ${item.type} for ${item.time} milliseconds.`)
                    this.contact._timeout = setTimeout(this.contact._timelimit, item.time, item)
                }
                
                // Pause the tease if so desired
                if (item.pause == 'true')
                    this.strokingController.pause(true)
            }
        },
        message: (options: object) => {
            let message = Object.assign({
                alert: 'info',
                color: null,
                id: -1,
                pause: 'false',
                text: 'No Text Provided',
                time: 4.1,
                type: 'message',
            }, options)
            this.contact._queue.push(message)
            if (!this.contact._active) {
                this.contact._active = true
                this.contact._work()
            }
        },
        prompt: (options: object) => {
            let prompt = Object.assign({
                alert: 'info',
                answer: [],
                color: null,
                id: -1,
                pause: 'true',
                text: 'No Text Provided',
                time: -1,
                timelimit: null,
                type: 'prompt'
            }, options)
            this.contact._queue.push(prompt)
            if (!this.contact._active) {
                this.contact._active = true
                this.contact._work()
            }
        },
        options: (options: object) => {
            let info = Object.assign({
                alert: 'info',
                color: null,
                id: -1,
                options: [],
                pause: 'true',
                text: 'No Text Provided',
                time: -1,
                timelimit: null,
                type: 'options'
            }, options)
            this.contact._queue.push(info)
            if (!this.contact._active) {
                this.contact._active = true
                this.contact._work()
            }
        }
    }

    numbermod(alpha: number, modifier: string, omega?: number) : number {
        if (omega == undefined) {
            let rawomega = parseInt(modifier.substring(1), 10)
            if (isNaN(rawomega)) {
                console.warn(`[ActionController/numbermod] Failed to extract omega from modifier '${modifier}'.`)
                return -1
            }
            omega = rawomega
            modifier = modifier[0]
        }
        switch(modifier) {
            case '+':
                return Math.round(alpha += omega)
            case '-':
                return Math.round(alpha -= omega)
            case '/':
                return Math.round(alpha /= omega)
            case '*':
                return Math.round(alpha *= omega)
            case '=':
                return Math.fround(omega)
        }
        return Math.round(alpha)
    }

    prioritize(actions: number[]) : number[] {
        let eligible : number[] = []

        // All actions without a set priority are automatically eligible
        for (var i = 0; i < actions.length; i++) {
            if (this.actions.raw[actions[i]].data.priority === -1) {
                eligible.push(actions.splice(i, 1)[0])
                i--
            }
        }

        // Find the highest priority of each category
        let compare = {}
        for (let i = 0; i < actions.length; i++) {
            let type = this.actions.raw[actions[i]].data.type
            let priority = this.actions.raw[actions[i]].data.priority
            if (Array.isArray(compare[type])) {
                let typePriority = compare[type][0][1]
                if (priority > typePriority)
                    compare[type] = [[actions[i], priority]]
                else if (priority == typePriority)
                    compare[type].push([actions[i], priority])
            } else
                compare[type] = [[actions[i], priority]]
        }

        // Add all highest priorities to eligible
        Object.keys(compare).forEach((key) => {
            compare[key].forEach((actionPriorityCombo) => eligible.push(actionPriorityCombo[0]))
        })

        // Return eligible cards
        return eligible
    }
}