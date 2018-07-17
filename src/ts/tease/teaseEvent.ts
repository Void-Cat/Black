class TeaseEvent {
    public origin: string | undefined
    public type: string
    public value: any

    constructor(type: string, value?: any, origin?: string) {
        this.type = type
        this.value = value
        this.origin = origin
    }
}

function watchTeaseEvent(callback, eventType?: string, eventValue?: any, eventOrigin?: string) {
    return $('event-catcher').on('teaseEvent', (_, data: TeaseEvent) => {
        if ((!isNullOrUndefined(eventType) && data.type != eventType) || 
            (!isNullOrUndefined(eventValue) && data.value != eventValue) ||
            (!isNullOrUndefined(eventOrigin) && data.origin != eventOrigin))
            return
        callback(data)        
    })
}