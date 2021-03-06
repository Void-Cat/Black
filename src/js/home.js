/* global $, currentVersion, storage */

// Function for cleaning the storage
function cleanStorage(newVersion) {
    // Cleaning storage for 1.7.0
    let del = ['teaseslave', 'profile.name.nick', 'settings.cardratio', 'teaseParams', 'teaseExit', 'winBounds']
    del.forEach((ldel) => {
        storage.delete(ldel)
    })
    storage.set('version', newVersion)
}

// Asynchronous function to check wether a new version is available.
function checkVersion () {
    var vfd = $.Deferred()
    $.getJSON('https://api.github.com/repos/Void-Cat/Black/releases').done((json) => {
        let newVersion = json[0].tag_name.split('.')
        let oldVersion = currentVersion.split('.')
        newVersion.forEach((t, i) => {
            newVersion[i] = parseInt(t, 10)
        })
        oldVersion.forEach((t, i) => {
            oldVersion[i] = parseInt(t, 10)
        })
        if (newVersion[0] > oldVersion[0] || (newVersion[0] === oldVersion[0] && newVersion[1] > oldVersion[1]) || (newVersion[0] === oldVersion[0] && newVersion[1] === oldVersion[1] && newVersion[2] > oldVersion[2])) {
            vfd.resolve(newVersion.join('.'))
        } else {
            if (storage.get('version') !== oldVersion.join('.'))
                cleanStorage(oldVersion.join('.'))
            vfd.reject('isCurrent:' + oldVersion.join('.'))
        }
    }).fail((err) => {
        vfd.reject(err)
    })
    return vfd.promise()
}

// Page logic: quick user stats
if (storage.get('profile') === undefined) {
    $('#aboutusr').hide()
    $('#aboutusr-fail').show()
} else {
    let aboutusr = [
        storage.get('profile.name.real'),
        storage.get('profile.sublevel'),
        storage.get('stats.lastTease.cumming.full'),
        storage.get('stats.total.cumming.full')
    ]
    $('.aboutusr-0').text(aboutusr[0])
    if (aboutusr[1] >= 3) {
        $('.aboutusr-1').text(storage.get('settings.subtags.good') || 'good')
    } else if (aboutusr[1] <= -2) {
        $('.aboutusr-1').text(storage.get('settings.subtags.bad') || 'bad')
    } else {
        $('.aboutusr-1').text(storage.get('settings.subtags.neutral') || 'boring')
    }
    if (storage.get('profile.gender.nick') === undefined) {
        $('.aboutusr-1').text($('.aboutusr-1').text() + ' slave')
    } else {
        $('.aboutusr-1').text($('.aboutusr-1').text() + ' ' + storage.get('profile.gender.nick').toLowerCase())
    }
    $('.aboutusr-2').text(aboutusr[2])
    $('.aboutusr-3').text(aboutusr[3])
}

// Page logic: version warning
$('#swapper').ready(_ => {
    $.when(checkVersion()).then((vn) => {
        $('.lvn').text(vn)
        $('#version-checking').slideUp(200, _ => {
            $('#version-new').slideDown(200)
        })
    }, (err) => {
        $('#version-checking').slideUp(200, _ => {
            if (err.indexOf('isCurrent') !== -1) {
                $('.lvn').text(err.split(':')[1])
                $('#version-current').slideDown(200)
            } else {
                $('#version-fail').slideDown(200)
                console.error('<home.html / checkVersion> Version check failed with error:', '\n', err)
            }
        })
    })
})
