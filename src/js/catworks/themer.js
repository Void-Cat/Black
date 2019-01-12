/* global storage */
/** Git gud. Catworks themer.js for easy integrated css themes.
 *  Requires electron-storage npm package to be defined to 'storage' variable
*/

function Theme (param) {
  this.themelist = param.themelist
  this.active = param.active || -1
  this.path = param.path || './themes/'
  this.setTheme = (name) => {
    if (typeof name === 'number') {
      name = this.themelist[name]
    }
    if (this.themelist.indexOf(name) !== -1) {
      if (name.indexOf('.dark') !== -1 && !document.querySelector('body').classList.contains('mdc-theme--dark')) {
        document.querySelector('body').classList.add('mdc-theme--dark')
      } else if (name.indexOf('.dark') === -1 && document.querySelector('body').classList.contains('mdc-theme--dark')) {
        document.querySelector('body').classList.remove('mdc-theme--dark')
      }
      document.getElementById('theme').setAttribute('href', this.path + name + '.theme.css')
      this.active = this.themelist.indexOf(name)
      storage.set('theme.index', this.themelist.indexOf(name))
      return name
    }
    return false
  }
  this.getTheme = _ => {
    return this.active
  }
}

module.exports = Theme
