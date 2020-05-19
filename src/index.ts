import { App } from './app'
import { Builder } from './builder'
import * as components from './components'
import { Context } from './context'
import { AppMain, Layout } from './layout'
import * as mixins from './mixins'
import * as models from './models'
import * as store from './store'
import * as utils from './utils'
export { App }
export { AppMain }
export { Builder }
export { Context }
export { Layout }
export { components }
export { mixins }
export { models }
export { store }
export { utils }
const _components = { App, Layout, AppMain }
const install = function(Vue: any, opts?: any) {
  if ((install as any).installed) return

  Object.keys(_components).forEach(component => {
    Vue.component(component, component)
  })
  Object.keys(components).forEach(component => {
    Vue.component(component, component)
  })
}
// tslint:disable-next-line: strict-type-predicates
if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue)
}
export default { App, AppMain, Builder, Context, Layout, components, mixins, models, store, utils, install }
declare global {
  interface Date {
    toSmartString(): string
  }
}

Date.prototype.toSmartString = function() {
  return utils.times.utils.toSmartString(this)
}
