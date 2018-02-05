/* global $, mdc, storage */
function getStat (gr) {
  console.debug('<stats.html / getStat>\nFunction called with gr:', gr)
  let stat = storage.get(gr)
  if (stat === undefined) {
    console.warn('<stats.html / getStat>\nStat', gr, 'found undefined.')
    return 0
  } else if (typeof stat === 'object') {
    return stat[0]
  } else {
    return stat
  }
}

$('[getstat]').each(function (i) {
  let gr = $(this).attr('getstat')
  $(this).text(getStat(gr))
})

$('tbody > tr:odd').css('background-color', 'rgba(0, 0, 0, 0.15)')

$('#swapper').ready(_ => {
  mdc.autoInit()
})
