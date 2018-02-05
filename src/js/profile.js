/* global $, mdc, storage, alert, swapper, dialog */
// var genderReal = new mdc.radio.MDCRadio($('.mdc-radio')[0])
// var noNickname = new mdc.checkbox.MDCCheckbox($('.mdc-checkbox')[0])
if (typeof edit === 'undefined') {
  var edit
}
edit = {
  name: {
    nick: '',
    real: ''
  },
  gender: {
    real: undefined,
    nick: ''
  }
}

$('[name="genderReal"]').click(_ => {
  storage.set('profile.gender.real', $('#genderReal-true').is(':checked'))
})
$('#realName').on('change', _ => {
  storage.set('profile.name.real', $('#realName').val())
  storage.set('profile.name.nick', $('#realName').val())
})
$('#genderNick').on('change', _ => {
  $('#genderNick').val() === '' ? storage.set('profile.gender.nick', 'slave') : storage.set('profile.gender.nick', $('#genderNick').val())
  $('#genderNick-example').text($('#genderNick').val())
})
/* $('#nickname').on('change', _ => {
  if ($('#nickname').val() !== '') {
    storage.set('profile.name.nick', $('#nickname').val())
  } else {
    storage.set('profile.name.nick', undefined)
  }
})
$('#noNickname').on('change', _ => {
  if ($('#noNickname').is(':checked')) {
    $('#nickname-textfield').slideUp(100)
    storage.set('profile.name.nick', false)
  } else {
    $('#nickname-textfield').slideDown(100)
    storage.set('profile.name.nick', $('#nickname').val())
  }
}) */
$('#saveProfile').click(_ => {
  let profiledata = [
    storage.get('profile.name.real'),
    storage.get('profile.name.nick'),
    storage.get('profile.gender.real'),
    storage.get('profile.gender.nick')
  ]
  if (profiledata.indexOf(undefined) === -1) {
    storage.set('stats.total.cumming', {full: 0, edge: 0, ruin: 0, nonAllowed: 0})
    storage.set('stats.lastTease.cumming', {full: 0, edge: 0, ruin: 0, nonAllowed: 0})
    storage.set('stats.total.punishments', {drawn: 0, deserved: 0})
    storage.set('stats.teases', {etes: 0, total: 0})
    storage.set('profile.sublevel', 0)
    alert('Profile saved.')
    swapper.reload()
  } else {
    alert('Not all fields seem to be filled (correctly).\nPlease make sure they are before saving!')
  }
})

if (storage.get('profile') === undefined) {
  $('#newprofile').show()
  $('#profile').hide()
} else {
  $('.profile-card').each((i) => {
    let el = $('.profile-card')[i]
    $(el).text(storage.get($(el).attr('class').split(' ')[1].split('-').join('.')))
  })
  if (storage.get('profile.gender.real')) {
    $('.profile-gender-real').text('male')
  } else {
    $('.profile-gender-real').text('female')
  }
}

$('#editPunishmentButton').click(_ => {
  dialog.showOpenDialog({
    title: 'Select Punisment Cards Folder',
    properties: ['openDirectory']
  }, (path) => {
    edit.punishment = path
    if (path === '' || path === undefined) {
      $('#editPunishmentLabel').fadeOut(200)
    } else {
      $('#editPunishmentLabel').text(path)
      $('#editPunishmentLabel').fadeIn(200)
    }
  })
})

$('#setPunishmentButton').click(_ => {
  dialog.showOpenDialog({
    title: 'Select Punisment Cards Folder',
    properties: ['openDirectory']
  }, (path) => {
    storage.set('profile.punishment', path)
    if (path === '' || path === undefined) {
      $('#setPunishmentLabel').fadeOut(200)
    } else {
      $('#setPunishmentLabel').text(path)
      $('#setPunishmentLabel').fadeIn(200)
    }
  })
})

$('#editProfileBtn').click(_ => {
  let profile = storage.get('profile')
  $('#edit-realname').change(_ => {
    edit.name.real = $('#edit-realname').val()
    edit.name.nick = $('#edit-realname').val()
  })
  $('#edit-realname').val(profile.name.real)
  $('#edit-realname').trigger('change')
  $('#edit-genderReal-true, #edit-genderReal-false').click(_ => {
    if ($('#edit-genderReal-true').is(':checked')) {
      edit.gender.real = true
    } else {
      edit.gender.real = false
    }
  })
  $('#edit-genderReal-' + profile.gender.real)
    .prop('checked', true)
    .trigger('click')
  if (profile.punishment !== undefined) {
    $('#editPunishmentLabel').text(profile.punishment)
    $('#editPunishmentLabel').show()
  }
  $('#edit-genderNick').change(_ => {
    $('#edit-genderNick-example').text($('#edit-genderNick').val())
    edit.gender.nick = $('#edit-genderNick').val()
  })
  $('#edit-genderNick').val(profile.gender.nick)
  $('#edit-genderNick').trigger('change')
  edit.punishment = profile.punishment
  $('#profile').slideUp(200, _ => {
    $('#editProfile').slideDown(200)
  })
})

$('#cancelEdit').click(_ => {
  $('#editProfile').slideUp(200, _ => {
    $('#profile').slideDown(200)
  })
})

function resetVal (value) {
  if (value === 'sublevel') {
    storage.set('profile.sublevel', 0)
    alert('Sublevel has been reset to 0.')
  } else if (value === 'cumming') {
    storage.set('stats.total.cumming', {full: 0, edge: 0, ruin: 0, nonAllowed: 0})
    storage.set('stats.lastTease.cumming', {full: 0, edge: 0, ruin: 0, nonAllowed: 0})
    alert('Cumming statistics have all been reset to 0.')
  } else if (value === 'teases') {
    storage.set('stats.teases', {etes: 0, total: 0})
    alert('Tease statistics have all been reset to 0.')
  } else if (value === 'punishments') {
    storage.set('stats.total.punishments', {drawn: 0, deserved: 0})
    alert('Punishment statistics have all been reset to 0.')
  } else {
    console.error('<profile.html / resetVal>\nValue', value, 'was not recognized.')
  }
}

$('#edit-saveProfileBtn').click(_ => {
  let test = [edit.name.real, edit.name.nick, edit.gender.real, edit.gender.nick]
  if (test.indexOf(undefined) === -1 && test.indexOf('') === -1) {
    storage.set('profile.name.real', edit.name.real)
    storage.set('profile.name.nick', edit.name.nick)
    storage.set('profile.gender.real', edit.gender.real)
    storage.set('profile.gender.nick', edit.gender.nick)
    storage.set('profile.punishment', edit.punishment)
    alert('Profile saved.')
    swapper.reload()
  } else {
    alert('Not all fields seem to be filled (correctly).\nPlease make sure they are before saving!')
  }
})

$('#deleteProfileBtn').click(_ => {
  storage.set('profile', undefined)
  storage.set('stats', undefined)
  alert('Profile deleted.')
  swapper.reload()
})

$('#swapper').ready(_ => {
  mdc.autoInit()
  if (resetVal) {}
})
