import ExitController from './exitcontroller'
import TeaseEvent from './teaseEvent'
import { isNumber } from 'util'
import ViewController from './viewcontroller';

export default class GoalController {
    allowedGoals = ['end', 'cum', 'release', 'minutes']
    ctc: string | boolean = false
    exitController: ExitController
    viewController: ViewController
    goal: string
    goalVal: number
    interval: any
    reached = false
    reachedVal = 0

    constructor(goal: string, exitController: ExitController, viewController: ViewController, goalVal?: number) {
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
        this.viewController = viewController
    }

    public ctcState(state?: string | boolean) : string | boolean {
        if (state === 'full' || state === 'ruin' || state === 'edge' || state === false) {
            this.ctc = state
            switch (this.ctc) {
                case 'full':
                    $('#info-cumming').text('Fully Allowed')
                    $('#cumming_btn-full, #cumming_btn-ruin, #cumming_btn-edge').addClass('mdc-button--primary')
                    break
                case 'ruin':
                    $('#info-cumming').text('Ruining Allowed')
                    $('#cumming_btn-ruin, #cumming_btn-edge').addClass('mdc-button--primary')
                    $('#cumming_btn-full').removeClass('mdc-button--primary')
                    break
                case 'edge':
                    $('#info-cumming').text('Edging Allowed')
                    $('#cumming_btn-edge').addClass('mdc-button--primary')
                    $('#cumming_btn-full, #cumming_btn-ruin').removeClass('mdc-button--primary')
                    break
                case false:
                    $('#info-cumming').text('Not Allowed')
                    $('#cumming_btn-full, #cumming_btn-ruin, #cumming_btn-edge').removeClass('mdc-button--primary')
            }
        }
        return this.ctc
    }

    public handleEvent(event: TeaseEvent) : boolean {
        if (event.type === 'cum') {
            this.exitController.cumming[event.value] += 1
            switch (this.ctc) {
                case 'ruin':
                    if (event.value === 'full') {
                        this.exitController.cumming['nonAllowed'] += 1
                        this.viewController.snackbar('You came while only allowed to ruin!')
                    }
                    break
                case 'edge':
                    if (event.value === 'full') {
                        this.exitController.cumming['nonAllowed'] += 1
                        this.viewController.snackbar('You came while only allowed to edge!')
                    } else if (event.value === 'ruin') {
                        this.exitController.cumming['nonAllowed'] += 1
                        this.viewController.snackbar('You ruined while only allowed to edge!')
                    }
                    break
                case false:
                    this.exitController.cumming['nonAllowed'] += 1
                    if (event.value === 'full')
                        this.viewController.snackbar('You came whilst not allowed to!')
                    else if (event.value === 'ruin')
                        this.viewController.snackbar('You ruined whilst not allowed to!')
                    else if (event.value === 'edge')
                        this.viewController.snackbar('You edged whilst not allowed to!')
            }
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