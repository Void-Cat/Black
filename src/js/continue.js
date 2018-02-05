$('#swapper').ready(_ => {
  $('#continuename').text(storage.get('swapper.continue'))
  $('#continuename').parent('button').attr('onclick', 'swapper.swap(\''+ storage.get('swapper.continue') + '\')')
})
