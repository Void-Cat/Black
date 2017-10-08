/** Git gud. Catworks swapper.js for dynamic content swapping in electron apps.
 *  Requires jQuery.
*/

const jquerypath = 'jquery'
const $ = require(jquerypath)
const Config = require('electron-config')

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
        if ($('.mdc-temporary-drawer').length > 0) {
          $('.mdc-temporary-drawer--selected').removeClass('mdc-temporary-drawer--selected')
          $('.mdc-list-item[onclick="swapper.swap(\'' + this.current + '\')"]').addClass('mdc-temporary-drawer--selected')
        } // This is for mdc drawers
        if (Config !== null) { // This is for electron-config applications
          let config = new Config()
          config.set('swapper.last', this.current)
        }
        console.debug('swap finished', loc)
      })
    })
  }
  this.start = (cont, home) => {
    let config = new Config()
    if (Config !== null && config.get('swapper.last') !== home && config.get('swapper.last') !== cont && config.get('swapper.last') !== 'teaseend') {
      if (config.get('swapper.last') !== null) {
        config.set('swapper.continue', config.get('swapper.last'))
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
