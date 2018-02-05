/* global storage, $, dialog, fs */
function hashCode (string) {
  var hash = 0
  var i, chr
  if (string.length === 0) return hash
  for (i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0 // Convert to 32bit integer
  }
  return hash
}

if (typeof teaseExit === 'undefined') {
  var teaseExit = storage.get('teaseExit')
  var cumInfo = storage.get('stats.lastTease.cumming')
  var punish = storage.get('stats.lastTease.cumming.nonAllowed')
  var sublevel = storage.get('profile.sublevel')
  var teaseTotal = storage.get('stats.teases.total')
} else {
  teaseExit = storage.get('teaseExit')
  cumInfo = storage.get('stats.lastTease.cumming')
  punish = storage.get('stats.lastTease.cumming.nonAllowed')
  sublevel = storage.get('profile.sublevel')
  teaseTotal = storage.get('stats.teases.total')
}
$('#punishmentDisplay').hide()
if (teaseExit === 'user') {
  if (sublevel > -5) sublevel--
  punish++
  $('.exit-user').slideDown(200)
} else if (teaseExit === 'end') {
  if (sublevel < 5) sublevel++
  $('.exit-end').slideDown(200)
}
// $('#generateTeaseReport')
$('.tease-total').text(teaseTotal)
$('.cum-total').text(cumInfo.full + cumInfo.ruin)
$('.cum-full').text(cumInfo.full)
$('.cum-edge').text(cumInfo.edge)
$('.cum-ruin').text(cumInfo.ruin)
if (cumInfo.nonAllowed > 0) {
  if (sublevel > -5) sublevel--
  $('.cum-nonAllowed').text(cumInfo.nonAllowed)
  $('.cum-nonAllowed-line').slideDown(200)
} else {
  if (sublevel < 5) sublevel++
  $('.cum-allowed-line').slideDown(200)
}
if (punish > 0) {
  if (storage.get('stats.total.punishments.deserved') === undefined) storage.set('stats.total.punishments.deserved', 0)
  storage.set('stats.total.punishments.deserved', storage.get('stats.total.punishments.deserved') + punish)
  if (storage.get('profile.punishment') === undefined) {
    $('#punishment-notset').slideDown(200)
  } else {
    $('.punishment').text(punish)
    $('#punishment-group').slideDown(200)
  }
} else {
  $('#homs-btn').addClass('mdc-button--primary')
  $('#rete-btn').addClass('mdc-button--accent')
}

if (storage.get('settings.autoReport')) {
  if (typeof storage.get('settings.autoReportPath')[0] === 'string') {
    $('#repo-btn').hide()
    generateReport(storage.get('settings.autoReportPath')[0])
  }
}

$('#punishmentSetButton').click(_ => {
  dialog.showOpenDialog({
    title: 'Select Punisment Cards Folder',
    properties: ['openDirectory']
  }, (path) => {
    if (path !== '' && path !== undefined) {
      storage.set('profile.punishment', path)
      $('#punishment-notset').slideUp(200)
      if (punish > 0) {
        $('.punishment').text(punish)
        $('#punishment-group').slideDown(200)
      }
    }
  })
})

$('#punishmentButton').click(_ => {
  let path = storage.get('profile.punishment')[0]
  let fold = fs.readdirSync(path)
  let pick = []
  if (storage.get('stats.total.punishments.drawn') === undefined) storage.set('stats.total.punishments.drawn', 0)
  fold.forEach((item) => {
    if (item.lastIndexOf('.') > 0) pick.push(item)
  })
  if (pick.length === 0) {
    $('#noPunishments').slideDown(200)
  } else {
    storage.set('stats.total.punishments', storage.get('stats.total.punishments') + 1)
    let punishment = pick[Math.floor(Math.random() * pick.length)]
    $('#punishmentDisplay').prepend('<img src="' + path + '/' + punishment + '" class="punishment-card" />')
    $('#punishmentDisplay').slideDown(200)
    if (punish > 0) punish--
    $('.punishment').text(punish)
    if (punish === 0) {
      $('#punishmentButton').removeClass('mdc-button--primary')
      $('#homs-btn').addClass('mdc-button--primary')
      $('#rete-btn').addClass('mdc-button--accent')
    }
  }
})

function generateReport (path) {
  let date = new Date()
  let report = [
    'Black Tease Report - ' + date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes(),
    'Name: ' + storage.get('profile.name.real'),
    '',
    'Card information:',
    '  Pictures: ' + storage.get('teaseslave.teaseParams.pictureAmount'),
    '  Cards: ' + Object.keys(storage.get('teaseslave.icl') || {}).length,
    '',
    'Cumming:',
    '  Full: ' + storage.get('stats.lastTease.cumming.full'),
    '  Ruined: ' + storage.get('stats.lastTease.cumming.ruin'),
    '  Edges: ' + storage.get('stats.lastTease.cumming.edge'),
    '  Without Permission: ' + storage.get('stats.lastTease.cumming.nonAllowed'),
    '',
    'You should be considered a ',
    ''
  ]
  let token = hashCode(report.join('\r\n'))
  report.push('Verification token: ' + token)
  if (storage.get('profile.sublevel') < -2) {
    report[13] += (storage.get('settings.subtags.bad') || 'bad') + ' '
  } else if (storage.get('profile.sublevel') > 2) {
    report[13] += (storage.get('settings.subtags.good') || 'good') + ' '
  } else {
    report[13] += (storage.get('settings.subtags.neutral') || 'boring') + ' '
  }
  report[13] += storage.get('profile.gender.nick')
  if (path === undefined) {
    dialog.showSaveDialog({
      title: 'Save Tease Report',
      defaultPath: storage.get('profile.name.real') + ' Tease Report ' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + '_' + date.getMinutes() + '.txt',
      buttonLabel: 'Save Report'
    }, (gPath) => {
      if (gPath !== undefined) {
        report = report.join('\r\n')
        fs.writeFileSync(gPath, report)
      } else {
        console.error('<teaseend.html / generateReport>\nNo path specified. Report not saved.')
      }
    })
  } else {
    report = report.join('\r\n')
    path += '\\' + storage.get('profile.name.real') + ' Tease Report ' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + '_' + date.getMinutes() + '.txt'
    fs.writeFileSync(path, report)
  }
}
