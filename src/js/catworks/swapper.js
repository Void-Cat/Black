/** Git gud. Catworks swapper.js for dynamic content swapping in electron apps.
 *  Requires jQuery.
*/

const $ = require('jquery')
const Store = require('electron-store')

function Swapper (id, location, current) {
  this.id = id || 'swapper'
  this.location = location || './html/'
  this.current = current || 'home'
  this.swap = (loc) => {
    console.debug('swap called', this, loc)
    let adr = this.location + loc + '.html'
    let id = '#' + this.id
    $(id).fadeOut(100, _ => {
      $(id).empty()
      $(id).load(adr, _ => {
        $(id).fadeIn(100)
        this.current = loc
        if ($('.mdc-drawer--temporary').length > 0) {
          $('.mdc-list-item--selected').removeClass('mdc-list-item--selected')
          $('.mdc-list-item[onclick="swapper.swap(\'' + this.current + '\')"]').addClass('mdc-list-item--selected')
        } // This is for mdc drawers
        if (Store !== null) { // This is for electron-store applications
          let storage = new Store()
          storage.set('swapper.last', this.current)
        }
        console.debug('swap finished', loc)
      })
    })
  }
  this.start = (cont, home) => {
    let storage = new Store()
    if (Store !== null && storage.get('swapper.last') !== home && storage.get('swapper.last') !== cont && storage.get('swapper.last') !== 'teaseend') {
      if (storage.get('swapper.last') !== null) {
        storage.set('swapper.continue', storage.get('swapper.last'))
        this.swap(cont)
      } else {
        this.swap(home)
      }
    } else {
      this.swap(home)
    }
  }
  this.reload = _ => {
    this.swap(this.current)
  }
}

module.exports = Swapper
