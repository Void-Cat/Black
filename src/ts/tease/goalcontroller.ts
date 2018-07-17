class GoalController {
    allowedGoals = ['end', 'cum', 'release', 'minutes']
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

    public handleEvent(event: TeaseEvent) : boolean {
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
                    if (event.type == 'cum' && event.value == 'full')
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