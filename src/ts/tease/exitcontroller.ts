/** Class for keeping track of tease-exits */
class ExitController {
    public readonly cua: {} = {};
    public highestBlock: number[] = [];
    public highestAllow: number[] = [];

    constructor(startState?: boolean) {
        if (isBoolean(startState))
            this.cua[-1] = (new cu(-1, startState, 0))
        else
            this.cua[-1] = (new cu(-1, true, 0))
        
    }

    /** Add an exit-controlunit to the controlunit-array (this.cua) */
    public addCU(id: number, allows = false, priority = 0) : boolean {
        if (!isNullOrUndefined(this.cua[id]))
            return false

        // Create cua
        this.cua[id] = new cu(id, allows, priority)

        // Update highest priority allow/block
        if (allows)
            if (this.highestAllow.length == 0 || this.cua[this.highestAllow[0]].priority == priority)
                this.highestAllow.push(id)
            else if (this.cua[this.highestAllow[0]].priority < priority)
                this.highestAllow = [id]
        else
            if (this.highestBlock.length == 0 || this.cua[this.highestBlock[0]].priority == priority)
                this.highestBlock.push(id)
            else if (this.cua[this.highestBlock[0]].priority < priority)
                this.highestBlock = [id]

        // Return success
        return true
    }

    /** Exists the tease if allowed */
    public exitTease(state: string) : boolean {
        if (state == 'teaseend') {
            storage.set('tease.exit', 'end')
            close()
            return true
        } else if (state == 'userexit' && this.allowed()) {
            storage.set('tease.exit', 'user')
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
    public removeCU(id: number) : boolean {
        if (isNullOrUndefined(this.cua[id]))
            return false
        
        // Update the highest allow/block
        if (this.cua[id].allows) {
            let index = this.highestAllow.indexOf(id)
            if (index != -1) {
                this.highestAllow.slice(index, index)
                if (this.highestAllow.length == 0)
                    this.updateHighest(true, this.cua[id].priority - 1)
            }
        } else {
            let index = this.highestBlock.indexOf(id)
            if (index != -1) {
                this.highestBlock.slice(index, index)
                if (this.highestBlock.length == 0)
                    this.updateHighest(false, this.cua[id].priority - 1)
            }
        }

        // Actually remove the item
        delete this.cua[id]

        return true
    }

    /** Updates a specified controlunit with new allowance or with new priority */
    public updateCU(id: number, newAllows?: boolean, newPriority?: number) : boolean {
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
        let highest: number[] = []
        Object.keys(this.cua).forEach((key) => {
            if (this.cua[key].allows == allows)
                if (this.cua[key].priority == priority)
                    highest.push(parseInt(key, 10))
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
    public readonly id: number
    public priority: number

    constructor(id: number, allows = false, priority = 0) {
        this.id = id
        this.allows = allows
        this.priority = priority
    }
}