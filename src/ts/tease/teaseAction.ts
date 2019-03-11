import { isNullOrUndefined, isArray } from 'util'

const allowedActions = {
    start: ['start', 'draw']
}

function verifyActionData(actiondata: object) : object {
    return [true]
}

export default class Action {
    // Default data for a card
    public data = {
        action: undefined,
        after: {
            active: false,
            actions: []
        },
        clean: true,
        conditional: {
            type: 'none',
            comparator: 'none',
            value: 'none',
            force: false
        },
        delay: 1,
        flags: [],
        fors: {
            type: 'instant',
            value: 'none'
        },
        index: 0,
        priority: -1,
        start: Infinity,
        type: 'none',
        until: {
            count: 1,
            delay: 0,
            type: 'end',
            value: 'none'
        }
    }

    public live = {}
    
    // Parse actiondata to actualized data variable
    constructor(actiondata: object, index: number) {
        let verify = verifyActionData(actiondata)
        if (verify[0] == false) {
            console.warn(`Action at index ${index} could not compile due to error in ${verify[1]}.`)
            return
        }

        // #region Parser
        // Parse Start
        if (actiondata['start'] == 'start')
            this.data.start = -1
        else
            this.data.start = index
        
        // Parse Delay
        if (!isNullOrUndefined(actiondata['delay'])) {
            let delay = parseInt(actiondata['delay'], 10)
            if (!isNaN(delay))
                this.data.delay = delay
        }
        
        // Parse Conditional
        if (!isNullOrUndefined(actiondata['conditional'])) {
            let conditional = actiondata['conditional'].split(':')
            let type = conditional[0]
            this.data.conditional.type = type
            if (type == 'sublevel' || type == 'slidetime' || type == 'strokecount')
                this.data.conditional.comparator = conditional.splice(1, 1)
            this.data.conditional.value = conditional[1]
            if (!isNullOrUndefined(conditional[2]))
                this.data.conditional.force = (conditional[2] == 'force')
        }

        // Parse Type
        this.data.type = actiondata['type']

        // Parse Priority
        if (!isNullOrUndefined(actiondata['priority']))
            this.data.priority = parseInt(actiondata['priority'], 10)

        // Parse Fors
        let fors = actiondata['fors'].split(':')
        if (fors[0] == 'type')
            fors.splice(0, 1)
        this.data.fors.type = fors[0]
        if (!isNullOrUndefined(fors[1]))
            this.data.fors.value = fors[1]
        
        // Parse Action
        let action = actiondata['action']
        switch (this.data.type) {
            case 'chastity':
                this.data.action = (action == 'true')
                break
            case 'item':
                if (Array.isArray(action))
                    this.data.action = {
                        slot: action[0],
                        item: action[1]
                    }
                else
                    this.data.action = {
                        slot: 'general',
                        item: action
                    }
                break
            case 'key':
                if (isNullOrUndefined(action)) {
                    this.data.action = 1
                    break
                }
                action = parseInt(action, 10)
                if (isNaN(action))
                    this.data.action = 1
                else
                    this.data.action = action
                break
            case 'setslide':
            case 'slidetime':
            case 'strokecount':
            case 'sublevel':
                if (['=', '+', '-', '/', '*', 's'].indexOf(action[0]) === -1) {
                    this.data.action = {
                        value: parseInt(action, 10),
                        modifier: '='
                    }
                    break
                }
                else if (action[0] == 's') {
                    action = action.split(':')[1].split(',')
                    this.data.action = []
                    action.forEach((step) => {
                        if (['=', '+', '-', '/', '*'].indexOf(step[0]) === -1)
                            this.data.action.push({
                                value: parseInt(step, 10),
                                modifier: '='
                            })
                        else {
                            let modifier = step[0]
                            let substep = parseInt(step.substring(1), 10)
                            this.data.action.push({
                                modifier: modifier,
                                value: substep
                            })
                        }
                    })
                    break
                }
                let modifier = action[0]
                action = action.substring(1)
                this.data.action = {
                    modifier: modifier,
                    value: action
                }
                break
            case 'skip':
                action = action.split(':')
                this.data.action = {
                    distance: parseInt(action[0], 10),
                    categoryName: action[1].toLowerCase()
                }
                break
            case 'ctc:force': // Obsolete, cleans to 'ctc'
                this.data.type = 'ctc'
            case 'contact':
            case 'ctc':
            case 'ignore':
            case 'instruction':
            case 'mood':
            case 'on':
            case 'position':
            case 'stop':
            case 'supermode':
            default:
                this.data.action = action
                break
        }

        // Parse UNTIL
        let until = actiondata['until']
        if (isNullOrUndefined(until) || until == 'end')
            this.data.until.type = 'end'
        else if (until == 'instant')
            this.data.until.type = until
        else {
            until = until.split(':')
            if (until[0] == 'type')
                until = until.splice(1)
            this.data.until.type = until[0].split(/[\*\+]/gi)[0]
            let l = until.length - 1
            let starindex = until[l].indexOf('*')
            let plusindex = until[l].indexOf('+')
            if (starindex != -1 && plusindex != -1) {
                let split = until[l].split('*')
                if (starindex < plusindex) {
                    split = split[1].split('+')
                    this.data.until.count = parseInt(split[0], 10)
                    this.data.until.delay = parseInt(split[1], 10)
                    this.data.until.value = until[l].split('*')[0]
                } else {
                    split = split.splice(1).push(split[0].split('+')[1])
                    this.data.until.count = parseInt(split[0], 10)
                    this.data.until.delay = parseInt(split[1], 10)
                    this.data.until.value = until[l].split('+')[0]
                }
            } else if (starindex != -1) {
                this.data.until.count = parseInt(until[l].split('*')[1], 10)
                this.data.until.value = until[l].split('*')[0]
            } else if (plusindex != -1) {
                this.data.until.delay = parseInt(until[l].split('+')[1], 10)
                this.data.until.value = until[l].split('+')[0]
            } else
                this.data.until.value = until[l]
            
            if (this.data.type === 'instruction' && this.data.until.delay === 0)
                this.data.until.delay = 1
        }

        // Parse CLEAN
        let clean = actiondata['clean']
        if (clean == 'false' || clean == false)
            this.data.clean = false
        else
            this.data.clean = true

        // Parse PRIORITY
        let priority = actiondata['priority']
        if (!isNaN(parseInt(priority, 10)))
            this.data.priority = parseInt(priority, 10)

        // Parse AFTER
        if (!isNullOrUndefined(actiondata['after'])) {
            if (Array.isArray(actiondata['after'])) {
                this.data.after.active = true
                this.data.after.actions = actiondata['after']
            } else if (typeof actiondata['after'] === 'object' && actiondata['after'] !== null) {
                this.data.after.active = true
                this.data.after.actions = [actiondata['after']]
            }
        }
        
        // Parse FLAGS
        if (!isNullOrUndefined(actiondata['flags']) && isArray(actiondata['flags']))
            this.data.flags = actiondata['flags']
        // #endregion
    }

    public setLive(name: string | number, value: any) : boolean {
        this.live[name] = value
        return true
    }

    public hasLive(name: string | number) : boolean {
        if (this.live[name] === null || this.live[name] === undefined)
            return false
        return true
    }

    public getLive(name: string | number, def?: any) : any {
        if (this.live[name] == null) {
            console.warn(`[TeaseAction] Live value '${name}' was never defined for action with index ${this.data.index}.`)
            if (def !== undefined)
                this.setLive(name, def)
            return def
        }
        return this.live[name]
    }

    public removeLive(name: string | number) : boolean {
        if (this.live[name] == null) {
            console.warn(`[TeaseAction] Live value '${name}' never defined for action with index ${this.data.index}.`)
            return false
        }
        delete this.live[name]
        return true
    }
}