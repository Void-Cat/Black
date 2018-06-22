const fs = require('fs')
const Store = require('electron-store')
var storage = new Store()

var Globals = {
  categories: storage.get('teaseslave.teaseParams.categories'),
  ctisList: storage.get('teaseslave.ctisList') || {},
  fileList: storage.get('teaseslave.fileList') || [],
  icl: storage.get('teaseslave.icl') || {}
}

if (!storage.get('teaseslave.teaseParams.useRatios')) {
  Object.keys(Globals.categories).forEach(key => {
    if (Globals.categories[key].amount > 0) {
      let name = Globals.categories[key]['name']
      let count = Count(Values(Globals.icl), name.toLowerCase())
      Globals.categories[key].ratio = Math.round(count / Globals.icl.length * 100)
    } else Globals.categories[key].ratio = 0
  })
}

var ValidateValue = {
  Conditional: (value: string) => {
    return (['chastity', 'mood', 'nextinstruction', 'lastinstruction', 'slidetime', 'strokecount', 'sublevel'].indexOf(value) >= 0)
  },
  Event: (value: string[]) => {
    if (value[0] == 'type') value.shift()
    if (value.length == 1) {
      return (['instant', 'never', 'any', 'key', 'picture', 'end'].indexOf(value[0]) >= 0)
    }
    if (value.length == 2) {
      if (value[0] == 'cum')
        return (['any', 'full', 'ruin', 'edge'].indexOf(value[1]) >= 0)
      else if (value[0] == 'instruction')
        return (['any', 'mistress', 'master'].indexOf(value[1]) >= 0 || Values(Globals.icl).indexOf(value[1]) >= 0)
      else return false
    }
  },
  Timing: (value: string) => {
    return (['instant', 'end', 'start'].indexOf(value) != -1)
  },
  Type: (value: string) => {
    return (['chastity', 'ctc', 'ignore', 'instruction', 'item', 'key', 'mood', 'on', 'position', 'setslide', 'skip', 'slidetime', 'stop', 'strokecount', 'sublevel'].indexOf(value) >= 0)
  }
}

function Count(obj: Array<any>, value: any) {
  if (obj[0] == null) return 0;
  let count = 0
  obj.forEach(el => {
    if (typeof el == 'string') el = el.toLowerCase()
    if (el == value) count++
  })
  return count;
}

function retrieveFiles(path: string, recursive: boolean, pattern?: string) {
  let files = []
  fs.readdirSync(path, (err, files: Array<string>) => {
    if (err) console.warn(err)
    files.forEach(file => {
      let stat = fs.lstatSync(path + '/' + file)
      if ((stat.isDirectory() || stat.isSymbolicLink()) && recursive) {
        files = files.concat(retrieveFiles(path + '/' + file, true, pattern))
      }
    });
  })
  return files
}

function Values(obj: object) {
  let ret = []
  for (let i in obj) {
    ret.push(obj[i])
  }
  return ret
}

class Action {
  // Default data for a card
  data = {
    action: {},
    active: false,
    after: {
      active: false,
      subactions: []
    },
    clean: true,
    conditional: {
      type: 'none',
      value: 'none',
      force: false
    },
    end: {
      type: 'end',
      value: 'none'
    },
    index: 0,
    priority: -1,
    start: Infinity,
    trigger: {
      type: 'instant',
      value: 'none'
    },
    type: 'none'
  }

  // Parse actiondata to actualized data variable
  constructor(actiondata: object, index: number) {
    
    //#region Parse START & DELAY
    if (actiondata['start'] == 'start') this.data.start = 0 + (typeof parseInt(actiondata['delay']) == 'number' ? parseInt(actiondata['delay']) : 0)
    else this.data.start = index + (typeof parseInt(actiondata['delay']) == 'number' ? parseInt(actiondata['delay']) : 0)
    //#endregion

    //#region Parse CONDITIONAL
    if (typeof actiondata['conditional'] == 'string') {
      let conditional = actiondata['conditional'].split(':')
      if (ValidateValue.Conditional(conditional[0])) {
        this.data.conditional.type = conditional[0]
        this.data.conditional.value = conditional[1]
        if (conditional.length > 2 && conditional[2] == 'force') this.data.conditional.force = true
      }
    }
    //#endregion

    //#region Parse TYPE
    if (typeof actiondata['type'] == 'string') {
      let type = actiondata['type']
      if (ValidateValue.Type(type)) {
        if (type == 'ctc:force') {
          this.data.action['force'] = true
          type = 'ctc'
        }
        this.data.type = type
      }
      else throw new EvalError('type')
    }
    else throw new EvalError('type')
    //#endregion

    //#region Parse PRIORITY
    if (typeof actiondata['priority'] == 'string') {
      if (typeof parseInt(actiondata['priority']) == 'number') this.data.priority = parseInt(actiondata['priority'])
    }
    //#endregion

    //#region Parse FORS
    if (actiondata['fors'] == 'string') {
      let fors = actiondata['fors'].split(':')
      if (fors[0] == 'type') fors.shift()
      if (ValidateValue.Event(fors)) {
        this.data.trigger.type = fors[0]
        if (fors.length > 1) this.data.trigger.value = fors[1]
      }
    }
    //#endregion

    //#region Parse Action
    var action = actiondata['action']
    switch(this.data.type) {
      case 'chastity':
        this.data.action['value'] = (actiondata['action'].toLowerCase() == 'false')
        break

      case 'contact':
        var parsedaction = JSON.parse(actiondata['action'])
        if (typeof parsedaction == 'object') this.data.action['value'] = parsedaction
        else throw new EvalError('action')
        break

      case 'ctc':
        if (typeof action == 'string') this.data.action['value'] = action
        else this.data.action['value'] = 'full'
        break

      case 'ignore':
        if (typeof action == 'string' && Values(Globals.icl).indexOf(action) != -1) this.data.action['value'] = action
        else throw new EvalError('action')
        break
      
      case 'instruction':
        if (typeof action == 'string') this.data.action['value'] = action
        else throw new EvalError('action')
        break

      case 'item':
        if (typeof action == 'string') {
          this.data.action['location'] = 'global'
          this.data.action['value'] = action
        } else if (typeof action == 'object' && action.length == 2) {
          if (action[0] == 'unlock') {
            this.data.action['location'] = action[1]
            this.data.action['value'] = action[0]
          } else {
            this.data.action['location'] = action[0]
            this.data.action['value'] = action[1]
          }
        } else throw new EvalError('action')
        break

      case 'key':
        if (typeof parseInt(action) == 'number') {
          var numberaction = parseInt(action)
          this.data.action['value'] = numberaction
        } else this.data.action['value'] = 1
        break
      
      case 'mood':
        if (['good', 'bad'].indexOf(action) != -1) this.data.action['value'] = action
        else throw new EvalError('action')
        break
      
      case 'on':
        if (typeof action == 'object' && action.length != null) {
          this.data.action['subactions'] = []
          try {
            action.forEach(na => {
              let ni = 0 //[TL]= timeline.IndexNext(this.data.trigger.type)
              this.data.action['subactions'].push(new Action(na, ni))
            })
          } catch(e) { throw new EvalError('action') }
        } else throw new EvalError('action')
        break

      case 'position':
        if (typeof action == 'string') {
          this.data.action['value'] = action
        } else throw new EvalError('action')
        break
      
      case 'setslide':
      case 'slidetime':
      case 'strokecount':
        if (typeof action == 'string') {
          let modifier = action[0]
          if (['=', '+', '-', '/', '*'].indexOf(modifier)) {
            this.data.action['modifier'] = modifier
            this.data.action['value'] = parseInt(action.substr(1))
          } else if (modifier == 's') {
            let s = action.split(':')[1].split(',')
            let n = []
            s.forEach((str) => {
              if (isNaN(parseInt(str[0]))) n.push([str[0], parseInt(str.substr(1))])
              else n.push('=', parseInt(str))
            })
            this.data.action['value'] = n
          } else if (!isNaN(parseInt(modifier))) {
            this.data.action['modifier'] = '='
            this.data.action['value'] = parseInt(action)
          } else throw new EvalError('action')
        } else if (typeof action == 'number') {
          this.data.action['modifier'] = '='
          this.data.action['value'] = action
        } else throw new EvalError('action')
        break

      case 'skip':
        if (typeof action == 'string' && action.indexOf(':') != -1) {
          let splitaction = action.split(':')
          if (isNaN(parseInt(splitaction[0]))) throw new EvalError('action')
          this.data.action['value'] = parseInt(splitaction[0])
          this.data.action['type'] = splitaction[1]
        } else throw new EvalError('action')
        break

      case 'stop':
        if (['block', 'allow', 'quit'].indexOf(action)) {
          this.data.action['value'] = action
        } else throw new EvalError('action')
        break
      
      case 'sublevel':
        if (typeof action == 'string') {
          if (['+', '-', '='].indexOf(action[0]) != -1) {
            let modifier = action[0]
            if (isNaN(parseInt(action.substring(1)))) throw new EvalError('action')
            this.data.action['modifier'] = action[0]
            this.data.action['value'] = parseInt(action.substring(1))
          } else if (!isNaN(parseInt(action))) {
            this.data.action['modifier'] = '='
            this.data.action['value'] = parseInt(action)
          } else throw new EvalError('action')
        }
        break
    }
    //#endregion
    
    //#region Parse UNTIL
    if (actiondata['until'] == 'string') {
      let until = actiondata['until'].split(':')
      if (until[0] == 'type') until.shift()
      if (ValidateValue.Event(until)) {
        this.data.trigger.type = until[0]
        if (until.length > 1) this.data.trigger.value = until[1]
      }
    }
    //#endregion
  
    //#region Parse AFTER
    if (typeof actiondata['after'] == 'object' && actiondata['after'][0] != null) {
      try {
        actiondata['after'].forEach(after => {
          this.data.after.subactions.push(new Action(after, index))
        })
      } catch(e) { throw new EvalError('after') }
    }
    //#endregion

    //#region Parse CLEAN
    if (actiondata['clean'] == 'false') {
      this.data.clean = false
    }
    //#endregion
  }
}

// Class for keeping track of individual cards.
class Card {
  // Variable keeping track of actions
  actions = []

  // Card centered data
  data = {
    index: 0
  }

  constructor(carddata: object, index: number) {    
    // Parse carddata to usable object if it's still in string form.
    if (typeof carddata == 'string') {
      carddata = JSON.parse(carddata)
    }

    this.data.index = index;

    // Make sure the card is properly parsed
    if (typeof carddata['actions'] != 'object') {
      return undefined;
    }

    carddata['actions'].forEach(action => {
      this.actions.push(new Action(action, index))
    })
  }
}

class ImageController {
  images = []
  index = -1
  unending = false

  constructor(startingIndex = -1, unending = false) {
    if (startingIndex <= 1) startingIndex = -1
    this.index = startingIndex
    this.unending = unending
  }

  public showImage(index?: number) {
    if (typeof index == 'undefined') index = this.index + 1
    let src = Globals.fileList[index]
    $('#imageShown').attr('src', src);
    src = Globals.fileList[index + 1]
    $('#imageBuffer').attr('src', src)
    this.index = index
    if (this.index + 20 > this.images.length) {
      // Generate more cards!
    }
  }
}

class Tease {
  imageController: ImageController
  strokingController: StrokingController
  
  constructor() {
    this.imageController = new ImageController(0, (storage.get('teaseslave.teaseParams.ending') || false))
    this.strokingController = new StrokingController(storage.get('teaseslave.teaseParams.timing.tickersrc'))
  }
}

class StrokingController {
  announce = {
    picture: new Audio(`atom:///${__dirname}/../audio/slidechange.ogg`),
    card: new Audio(`atom:///${__dirname}/../audio/card.ogg`)
  }
  audiofiles: HTMLAudioElement[] = []
  interval = {}
  running = true
  silent = false
  timer = 0
  timing = {
    strokes: 10,
    seconds: 10
  }
  volume = 1

  constructor(path: string, strokes = 10, seconds = 10, buffer = 4, running = true, volume = 1) {
    if (fs.existsSync('./src/html/' + path)) {
      for (let n = 0; n < buffer; n++) {
        this.audiofiles.push(new Audio(path))
      }
    } else {
      throw new Error('Audiofile could not be found: ' + path)
    }
    
    this.running = running
    this.interval = {}

    Object.assign(this.timing, {
      strokes: strokes,
      seconds: seconds
    })
  }

  public playAnnounce(type: string) {
    this.announce.card.volume = this.announce.picture.volume = this.volume
    if (type == 'picture') this.announce.picture.play()
    if (type == 'card') this.announce.card.play()
  }

  public pause(pause = !this.running) {
    if (pause) {
      this.running = false;
      this.setVolume(0, false)
    } else {
      this.running = true;
      this.setVolume(this.volume, false);
    }
  }

  private play() {
    this.audiofiles[0].play()
    let shift = this.audiofiles.shift()
    this.audiofiles.push(shift)
  }

  public startCardTimer() {
    this.interval['ticker'] = setInterval(() => {
      this.play()
    }, Math.floor(this.timing.seconds * 1000 / this.timing.strokes))
    this.interval['timer'] = setInterval(() => {
      if (this.running) this.timer += 0.5
      if (this.timer >= this.timing.seconds) {
        this.timer = 0
        $('main').trigger('nextslide')
        clearInterval(this.interval['ticker'])
        clearInterval(this.interval['timer'])
        this.startCardTimer()
      }
    }, 500)
  }

  public setVolume(v: number, cv = true) {
    if (v > 1 && v <= 100) v = v / 100
    else if (v > 1) throw new Error('Volume out of bounds.')
    if (cv) this.volume = v;
    this.audiofiles.forEach((el) => {
      el.volume = v;
    })
  }
}

class Timeline {
  length = 0

  constructor(length: number) {
    this.length = length

  }
}