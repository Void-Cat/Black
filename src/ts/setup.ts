declare const mdc

// Setup page components
$(document).ready(() => {
    // Setup card mode
    let cardModeSelection = new mdc.select.MDCSelect($('#cardModeSelection').parent()[0])
    cardModeSelection.listen('change', () => {
        $('#cardMode').children().slideUp(200, () => {
            $('#cardMode').children('#cardMode:' + cardModeSelection.value)
        })
    })
})