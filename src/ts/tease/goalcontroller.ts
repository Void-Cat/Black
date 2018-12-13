import ExitController from './exitcontroller'
import TeaseEvent from './teaseEvent'
import { isNumber } from 'util'

export default class GoalController {
    allowedGoals = ['end', 'cum', 'release', 'minutes']
    ctc: string | boolean = false
    exitController: ExitController
    goal: string
    goalVal: number
    interval: any
    reached = false
    reachedVal = 0

    constructor(goal: string, exitController: ExitController, goalVal?: number) {
        if (this.allowedGoals.indexOf(goal) == -1)
            throw new Error(`Goal '${goal}' wasn't recognized`)
        
        if (goal == 'cum' || goal == 'minutes') {
            if (!isNumber(goalVal))
                throw new Error(`Goal '${goal}' required a numerical variabel, but '${goalVal}' was provided.`)
            else {
                this.goalVal = goalVal
                if (goal == 'minutes')
                    this.interval = setInterval(() => this.minuteHandler(), 60000)
            }
        } else 
            this.goalVal = 0

        this.goal = goal
        this.exitController = exitController
    }

    public ctcState(state?: string | boolean) : string | boolean {
        if (state === 'full' || state === 'ruin' || state === 'edge' || state === false) {
            this.ctc = state
            switch (this.ctc) {
                case 'full':
                    $('#info-cumming').text('Fully Allowed')
                    break
                case 'ruin':
                    $('#info-cumming').text('Ruining Allowed')
                    break
                case 'edge':
                    $('#info-cumming').text('Edging Allowed')
                    break
                case false:
                    $('#info-cumming').text('Not Allowed')
            }
        }
        return this.ctc
    }

    public handleEvent(event: TeaseEvent) : boolean {
        if (event.type === 'cum') {
            this.exitController.cumming[event.value] += 1
            if (this.ctc !== event.type)
                this.exitController.cumming['nonAllowed'] += 1
        }
        if (!this.reached)
            switch (this.goal) {
                case 'end':
                    if (event.type == 'tease' && event.value == 'end') {
                        this.reached = true
                        this.exitController.removeCU(-1)
                        return true
                    }
                    return false
                case 'cum':
                    if (event.type == 'cum' && (event.value == 'full' || event.value == 'ruin'))
                        this.reachedVal++
                    if (this.reachedVal >= this.goalVal) {
                        this.reached = true
                        this.exitController.removeCU(-1)
                        return true
                    }
                    return false
                case 'release':
                    if (event.type == 'card' && event.value == 'release') {
                        this.reached = true
                        this.exitController.removeCU(-1)
                        return true
                    }
                    return false
                default:
                    return false
            }
        else
            return true
    }

    minuteHandler() {
        if (++this.reachedVal >= this.goalVal) {
            this.reached = true
            clearInterval(this.interval)
            this.exitController.removeCU(-1)
        }
    }
}