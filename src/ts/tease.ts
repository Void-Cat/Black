class Action {
  constructor(input:object) {
    
  }
}

class Card {
  constructor(options: object) {
    Object.assign({
      start: 0,
      end: -1,
      priority: -1,
      action: null
    }, options)
  }
}
