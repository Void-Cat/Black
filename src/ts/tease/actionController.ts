class ActionController {
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
            picture: []
        },
        raw: {
            _: []
        }
    }
    imageController: ImageController
    mood: number = 0
    strokingController: StrokingController
    sublevel: number = storage.get('profile.sublevel')
    priority = {
        chastity: -1
    }
    viewController: ViewController

    constructor(imageController: ImageController,strokingController: StrokingController, viewController: ViewController) {
        this.imageController = imageController
        this.strokingController = strokingController
        this.viewController = viewController
    }

    public push(action: Action, active: boolean = true) : number {
        let id
        if (this.actions.raw._.length > 0)
            id = this.actions.raw._.splice(0, 1)
        else
            id = Object.keys(this.actions.raw).length - 1
        
        switch (action.data.fors.type) {
            case 'any':
            case 'key':
            case 'picture':
                this.actions.fors[action.data.fors.type].push(id)
                break
            case 'cum':
                this.actions.fors.cum[action.data.fors.type].push(id)
                break
            case 'instruction':
                let value = action.data.fors.value
                if (value == 'any')
                    this.actions.fors.instruction.any.push(id)
                else if (value == 'mistress')
                    this.actions.fors.instruction.mistress.push(id)
                else
                    if (isNullOrUndefined(this.actions.fors.instruction.instruction[value]))
                        this.actions.fors.instruction.instruction[value] = [id]
                    else
                        this.actions.fors.instruction.instruction[value].push(id)
                break
        }

        if (active) {
            this.actions.active.push(id)
        }

        return id
    }

    public remove(id: number) {}

    public exec(event: TeaseEvent) {
        let cards = this.actions.fors.any
        switch (event.type) {
            case 'cum':
                cards = cards.concat(this.actions.fors.cum.any).concat(this.actions.fors[event.value])
                break
            case 'any':
            case 'key':
            case 'picture':
                cards = cards.concat(this.actions.fors[event.type])
                break
            case 'instruction':
                cards = cards.concat(this.actions.fors.instruction.any).concat(this.actions.fors.instruction.instruction[event.type])
                if (event.type.indexOf('mistress') != -1 || event.type.indexOf('master') != -1)
                    cards = cards.concat(this.actions.fors.instruction.mistress)
                break
        }
        for (let i = 0; i < cards.length; i++) {
            if (this.actions.active.indexOf(cards[i]) == -1) {
                cards.splice(i, 1)
                i--
            }
        }

        cards.forEach((key) => {
            let action : Action = this.actions.raw[key]
            if (this.conditional(action, key))
                this.execByType[action.data.type](action)
        })
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
                    var cv : any = storage.get('profile.sublevel')
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

    execByType = {
        chastity: (action: Action) => {
            this.strokingController.chastity(action.data.action)
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
            if (!isNullOrUndefined(answers['prompt:' + input])) {
                this.push(new Action(answers['prompt:' + input], this.viewController.index))
            } else if (!isNullOrUndefined(answers['else'])) {
                this.push(new Action(answers['else'], this.viewController.index))
            }
            if (!isNullOrUndefined(answers['carry'])) {
                let carry : any = JSON.stringify(answers['carry'])
                carry.replace('//carry//', input)
                carry = JSON.parse(carry)
                this.push(new Action(carry, this.viewController.index))
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
            }

            if (this.contact._queue.length > 0)
                this.contact._work()
            else
                this.contact._active = false
        },
        _work: () => {
            let item = this.contact._queue.shift()
            let element = this.contact._element

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
                    break

                case 'options':
                    $(element.footer.options).empty().show().siblings('footer').hide()
                    Object.keys(item.options).forEach((option) => {
                        $(element.footer.options).append(`<button class="mdc-button" option="${option}">${option}</button>`).on('click', () => {
                            this.push(new Action(item.options[option], this.viewController.index))
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
            }

            // Show the dialog
            this.contact._dialog.show()

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
        },
        message: (options: object) => {
            let message = Object.assign({
                alert: 'info',
                color: null,
                id: -1,
                pause: false,
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
                pause: true,
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
                pause: true,
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
}