//var storage = new Storage();
declare var storage
declare const fs

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

function retrieveFiles(path: string, recursive: boolean, pattern?: string) {
    let files = []
    fs.readdirSync(path, (err, files: Array<string>) => {
        if (err) console.warn(err)
        files.forEach(file => {
            let stat = fs.lstatSync(path + '/' + file)
            if ((stat.isDirectory() || stat.isSymbolicLink()) && recursive) {
                files = files.concat(retrieveFiles(path + '/' + file, true, pattern))
            }
        });
    })
    return files
}

function Values(obj: object) {
    let ret = []
    for (let i in obj) {
        ret.push(obj[i])
    }
    return ret
}

class Action {
    // Default data for a card
    data = {
        action: {},
        active: false,
        after: {
            active: false,
            subactions: []
        },
        clean: true,
        conditional: {
            type: 'none',
            value: 'none',
            force: false
        },
        end: {
            type: 'end',
            value: 'none'
        },
        index: 0,
        priority: -1,
        start: Infinity,
        trigger: {
            type: 'instant',
            value: 'none'
        },
        type: 'none'
    }
    
    // Parse actiondata to actualized data variable
    constructor(actiondata: object, index: number) {
        
        //#region Parse START & DELAY
        if (actiondata['start'] == 'start') this.data.start = 0 + (isNumber(parseInt(actiondata['delay'], 10)) ? parseInt(actiondata['delay'], 10) : 0)
        else this.data.start = index + (isNumber(parseInt(actiondata['delay'], 10)) ? parseInt(actiondata['delay'], 10) : 0)
        //#endregion
        
        //#region Parse CONDITIONAL
        if (isString(actiondata['conditional'])) {
            let conditional = actiondata['conditional'].split(':')
            if (ValidateValue.Conditional(conditional[0])) {
                this.data.conditional.type = conditional[0]
                this.data.conditional.value = conditional[1]
                if (conditional.length > 2 && conditional[2] == 'force') this.data.conditional.force = true
            }
        }
        //#endregion
        
        //#region Parse TYPE
        let type = actiondata['type']
        if (ValidateValue.Type(type)) {
            if (type == 'ctc:force') {
                this.data.action['force'] = true
                type = 'ctc'
            }
            this.data.type = type
        }
        else throw new EvalError(`type: ${type}`)
        //#endregion
        
        //#region Parse PRIORITY
        if (typeof actiondata['priority'] == 'string') {
            if (typeof parseInt(actiondata['priority']) == 'number') this.data.priority = parseInt(actiondata['priority'])
        }
        //#endregion
        
        //#region Parse FORS
        if (actiondata['fors'] == 'string') {
            let fors = actiondata['fors'].split(':')
            if (fors[0] == 'type') fors.shift()
            if (ValidateValue.Event(fors)) {
                this.data.trigger.type = fors[0]
                if (fors.length > 1) this.data.trigger.value = fors[1]
            }
        }
        //#endregion
        
        //#region Parse Action
        var action = actiondata['action']
        switch(this.data.type) {
            case 'chastity':
            this.data.action['value'] = (actiondata['action'].toLowerCase() == 'false')
            break
            
            case 'contact':
            var parsedaction = JSON.parse(actiondata['action'])
            if (typeof parsedaction == 'object') this.data.action['value'] = parsedaction
            else throw new EvalError(`action: ${action} (type: ${this.data.type})`)
            break
            
            case 'ctc':
            if (typeof action == 'string') this.data.action['value'] = action
            else this.data.action['value'] = 'full'
            break
            
            case 'ignore':
            if (categories.matchName(action.toLowerCase()) || action.toLowerCase() == 'mistress') this.data.action['value'] = action
            else console.warn(`Ignore planned on non-present card-type '${action}'. (cardindex: ${index})`)
            break
            
            case 'instruction':
            if (typeof action == 'string') this.data.action['value'] = action
            else throw new EvalError(`action: ${action} (type: ${this.data.type})`)
            break
            
            case 'item':
            if (typeof action == 'string') {
                this.data.action['location'] = 'global'
                this.data.action['value'] = action
            } else if (typeof action == 'object' && action.length == 2) {
                if (action[0] == 'unlock') {
                    this.data.action['location'] = action[1]
                    this.data.action['value'] = action[0]
                } else {
                    this.data.action['location'] = action[0]
                    this.data.action['value'] = action[1]
                }
            } else throw new EvalError(`action: ${action} (type: ${this.data.type})`)
            break
            
            case 'key':
            if (typeof parseInt(action) == 'number') {
                var numberaction = parseInt(action)
                this.data.action['value'] = numberaction
            } else this.data.action['value'] = 1
            break
            
            case 'mood':
            if (['good', 'bad'].indexOf(action) != -1) this.data.action['value'] = action
            else throw new EvalError(`action: ${action} (type: ${this.data.type})`)
            break
            
            case 'on':
            if (typeof action == 'object' && action.length != null) {
                this.data.action['subactions'] = []
                try {
                    action.forEach(na => {
                        let ni = 0 //[TL]= timeline.IndexNext(this.data.trigger.type)
                        this.data.action['subactions'].push(new Action(na, ni))
                    })
                } catch(e) { throw new EvalError(`action: ${action} (type: ${this.data.type})`) }
            } else throw new EvalError(`action: ${action} (type: ${this.data.type})`)
            break
            
            case 'position':
            if (typeof action == 'string') {
                this.data.action['value'] = action
            } else throw new EvalError(`action: ${action} (type: ${this.data.type})`)
            break
            
            case 'setslide':
            case 'slidetime':
            case 'strokecount':
            if (action.match(/^[0-9]+$/)) {
                this.data.action['modifier'] = '='
                this.data.action['value'] = parseInt(action)
            } else if (isString(action)) {
                if (action.match(/^[\+\-\*\/]/i) && !isNaN(parseInt(action.substring(1)))) {
                    this.data.action['modifier'] = action[0]
                    this.data.action['value'] = parseInt(action.substring(1))
                } else if (action.match(/^sw:/i)) {
                    this.data.action['modifier'] = action.substring(0, 2)
                    this.data.action['value'] = action.substring(3).split(',')
                }
            } else throw new EvalError(`action: ${action} (type: ${this.data.type})`)
            break
            
            case 'skip':
            if (typeof action == 'string' && action.indexOf(':') != -1) {
                let splitaction = action.split(':')
                if (isNaN(parseInt(splitaction[0]))) throw new EvalError(`action: ${action} (type: ${this.data.type})`)
                this.data.action['value'] = parseInt(splitaction[0])
                this.data.action['type'] = splitaction[1]
            } else throw new EvalError(`action: ${action} (type: ${this.data.type})`)
            break
            
            case 'stop':
            if (['block', 'allow', 'quit'].indexOf(action) != -1) {
                this.data.action['value'] = action
            } else throw new EvalError(`action: ${action} (type: ${this.data.type})`)
            break
            
            case 'sublevel':
            if (typeof action == 'string') {
                if (['+', '-', '='].indexOf(action[0]) != -1) {
                    let modifier = action[0]
                    if (isNaN(parseInt(action.substring(1)))) throw new EvalError(`action: ${action} (type: ${this.data.type})`)
                    this.data.action['modifier'] = action[0]
                    this.data.action['value'] = parseInt(action.substring(1))
                } else if (!isNaN(parseInt(action))) {
                    this.data.action['modifier'] = '='
                    this.data.action['value'] = parseInt(action)
                } else throw new EvalError(`action: ${action} (type: ${this.data.type})`)
            }
            break
        }
        //#endregion
        
        //#region Parse UNTIL
        if (actiondata['until'] == 'string') {
            let until = actiondata['until'].split(':')
            if (until[0] == 'type') until.shift()
            if (ValidateValue.Event(until)) {
                this.data.trigger.type = until[0]
                if (until.length > 1) this.data.trigger.value = until[1]
            }
        }
        //#endregion
        
        //#region Parse AFTER
        if (typeof actiondata['after'] == 'object' && actiondata['after'][0] != null) {
            try {
                actiondata['after'].forEach(after => {
                    this.data.after.subactions.push(new Action(after, index))
                })
            } catch(e) { throw new EvalError('after') }
        }
        //#endregion
        
        //#region Parse CLEAN
        if (actiondata['clean'] == 'false') {
            this.data.clean = false
        }
        //#endregion
    }
}

// Class for keeping track of individual cards.
class Card {
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
            return undefined;
        }
        
        carddata['actions'].forEach(action => {
            this.actions.push(new Action(action, index))
        })
    }
}

class Tease {
    exitController: ExitController
    goalController: GoalController
    imageController: ImageController
    strokingController: StrokingController
    viewController: ViewController
    
    constructor() {
        this.imageController = new ImageController(0, (storage.get('tease.setup.infinite') || false))
        this.exitController = new ExitController(storage.get('tease.setup.blockexit'))
        this.goalController = new GoalController(storage.get('tease.setup.goal'), this.exitController, storage.get('tease.setup.goalx'))
        this.viewController = new ViewController(this.imageController, this.exitController, '#view')
        this.strokingController = new StrokingController(this.viewController)
    }

    public start() : void {
        this.viewController.jumpSlide(0)
    }
}