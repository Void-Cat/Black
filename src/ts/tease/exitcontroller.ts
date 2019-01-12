declare const storage
import { isBoolean, isNumber, isNullOrUndefined } from 'util'

/** Class for keeping track of tease-exits */
export default class ExitController {
    public readonly cua: object = {}
    public highestBlock: string[] = []
    public highestAllow: string[] = []
    public cumming: object = {
        full: 0,
        edge: 0,
        ruin: 0,
        nonAllowed: 0
    }

    constructor(startState?: boolean) {
        if (isBoolean(startState))
            this.addCU(-1, startState, -1)
        else
            this.addCU(-1, true, -1)
    }

    /** Add an exit-controlunit to the controlunit-array (this.cua) */
    public addCU(id: number | string, allows = false, priority = 0) : boolean {
        id = id.toString()

        if (!isNullOrUndefined(this.cua[id]))
            return false

        // Create cu
        this.cua[id] = new cu(id, allows, priority)

        // Update highest priority allow/block
        if (allows) {
            if (this.highestAllow.length == 0 || this.cua[this.highestAllow[0]].priority == priority)
                this.highestAllow.push(id)
            else if (this.cua[this.highestAllow[0]].priority < priority)
                this.highestAllow = [id]
        } else {
            if (this.highestBlock.length == 0 || this.cua[this.highestBlock[0]].priority == priority)
                this.highestBlock.push(id)
            else if (this.cua[this.highestBlock[0]].priority < priority)
                this.highestBlock = [id]
        }

        // Return success
        return true
    }

    private updateStatics(end: string) {
        storage.set('tease.exit', end)
        storage.set('stats.lastTease.cumming', this.cumming)
        storage.set('stats.teases.total', storage.get('stats.teases.total') + 1)
        if (end === 'user')
            storage.set('stats.teases.etes', storage.get('stats.teases.etes') + 1)
        let lcumming = storage.get('stats.total.cumming')
        lcumming['full'] += this.cumming['full']
        lcumming['edge'] += this.cumming['edge']
        lcumming['ruin'] += this.cumming['ruin']
        lcumming['nonAllowed'] += this.cumming['nonAllowed']
        storage.set('stats.total.cumming', lcumming)
    }

    /** Exists the tease if allowed */
    public exitTease(state: string) : boolean {
        if (state == 'teaseend') {
            this.updateStatics('end')
            setTimeout(() => close(), 10000)
            return true
        } else if (state == 'quitcard') {
            this.updateStatics('card')
            setTimeout(() => close(), 10000)
            return true
        } else if (state == 'userexit' && this.allowed()) {
            this.updateStatics('user')
            close()
            return true
        }
        return false
    }

    /** Checks wether or not a user is allowed to quit manually. */
    public allowed() : boolean {
        let allows = this.highestAllow.length
        let blocks = this.highestBlock.length
        
        if (blocks == 0)
            return true
        else if (allows == 0)
            return false
        else if (this.cua[this.highestAllow[0]].priority > this.cua[this.highestBlock[0]].priority)
            return true
        else if (this.cua[this.highestAllow[0]].priority < this.cua[this.highestBlock[0]].priority)
            return false
        else if (allows >= blocks)
            return true
        else
            return false
    }

    /** Remove an exit-controlunit from the controlunit-array (this.cua) */
    public removeCU(id: number | string) : boolean {
        id = id.toString()

        if (isNullOrUndefined(this.cua[id]))
            return false
        
        // Update the highest allow/block
        if (this.cua[id].allows) {
            let index = this.highestAllow.indexOf(id)
            if (index != -1) {
                this.highestAllow.splice(index, 1)
                if (this.highestAllow.length == 0)
                    this.updateHighest(true, this.cua[id].priority - 1)
            }
        } else {
            let index = this.highestBlock.indexOf(id)
            if (index != -1) {
                this.highestBlock.splice(index, 1)
                if (this.highestBlock.length == 0)
                    this.updateHighest(false, this.cua[id].priority - 1)
            }
        }

        // Actually remove the item
        delete this.cua[id]

        return true
    }

    /** Updates a specified controlunit with new allowance or with new priority */
    public updateCU(id: number | string, newAllows?: boolean, newPriority?: number) : boolean {
        id = id.toString()

        if (isNullOrUndefined(this.cua[id]) || (!isBoolean(newAllows) && !isNumber(newPriority)))
            return false

        if (this.cua[id].allows && this.highestAllow.indexOf(id) != -1) {
            let index = this.highestAllow.indexOf(id)
            this.highestAllow.slice(index, index)              
        } else if (this.highestBlock.indexOf(id) != -1) {
            let index = this.highestBlock.indexOf(id)
            this.highestBlock.slice(index, index)
        }

        if (isBoolean(newAllows))
            this.cua[id].allows = newAllows
        if (isNumber(newPriority))
            this.cua[id].priority = newPriority

        this.updateHighest(newAllows || this.cua[id].allows, newPriority || this.cua[id].priority)
        return true
    }

    /** Updates the highest allow/block array to the specified priority level */
    private updateHighest(allows: boolean, priority: number) : void {
        let highest: string[] = []
        Object.keys(this.cua).forEach((key) => {
            if (this.cua[key].allows == allows)
                if (this.cua[key].priority == priority)
                    highest.push(key)
        })
        if (highest.length > 0)
            if (allows)
                this.highestAllow = highest
            else
                this.highestBlock = highest
        else
            if (priority > 0)
                this.updateHighest(allows, priority - 1)
    }
}

/** Class for ExitHandler control-units */
class cu {
    public allows: boolean
    public readonly id: string
    public priority: number

    constructor(id: number | string, allows = false, priority = 0) {
        this.id = id.toString()
        this.allows = allows
        this.priority = priority
    }
}