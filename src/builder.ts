import { AxiosInstance } from 'axios'
import ElementUI from 'element-ui'
import { v4 as uuid } from 'uuid'
import Vue, { VueConstructor } from 'vue'
import VueRouter, { Route } from 'vue-router'
import { Store } from 'vuex'
import { App } from './app'
import * as builders from './builders'
import { Context } from './context'
import { Premission } from './directives'
import * as filters from './filters'
import { IRootState } from './store'
import { helper, ui } from './utils'

export class Builder {
  private _payload: any = {}
  private _routers!: VueRouter
  private _store!: Store<IRootState>
  private _app!: VueConstructor
  private _process!: ui.Process
  private _message!: ui.Message
  // tslint:disable-next-line: variable-name
  private _message_box!: ui.MessageBox
  private _context: Context
  private _title!: string
  private _axios!: AxiosInstance
  private _filters: { [key: string]: Function } = Object.assign({}, filters)

  public constructor(context?: Context) {
    this._context = context || new Context()
    this.app(App)
    this.message(new helper.MessageHelper())
    this.messagebox(new helper.MessageBoxHelper())
    this.process(new helper.ProcessHelper())
  }

  public static create(context?: Context): Builder {
    return new Builder(context)
  }

  public router(config: (bd: builders.RouterBuilder) => void): Builder {
    let builder = new builders.RouterBuilder(this._context)
    config(builder)
    this._routers = builder.build()
    return this
  }

  public store(config: (bd: builders.StoreBuilder) => void): Builder {
    let builder = new builders.StoreBuilder(this._context)
    config(builder)
    this._store = builder.build()
    return this
  }

  public extra(config: (payload: any) => void): Builder {
    config(this._payload)
    return this
  }

  public process(util: ui.Process): Builder {
    this._process = util
    return this
  }

  public message(util: ui.Message): Builder {
    this._message = util
    return this
  }

  public messagebox(util: ui.MessageBox): Builder {
    this._message_box = util
    return this
  }

  public app(app: VueConstructor): Builder {
    this._app = app
    return this
  }

  public title(title: string): Builder {
    this._title = title
    return this
  }

  public axios(axios: AxiosInstance) {
    this._axios = axios
  }

  public filters(filters: { [key: string]: Function }): Builder {
    Object.assign(this._filters, filters)
    return this
  }

  public build(): Vue {
    if (!this._routers) {
      this.router(() => {})
    }
    if (!this._store) {
      this.store(() => {})
    }
    let router = this._routers
    let store = this._store

    axiosInterceptor(this._axios, store, this._message, this._message_box)
    routerInterceptor(router, store, this._process, this._message)

    Vue.use(ElementUI, {
      size: 'mini'
    })

    let app = new Vue({
      router,
      store,
      ...this._payload,
      render: h => h(this._app),
      directives: { permission: new Premission(store) },
      filters: this._filters
    })
    app.$mount('#app')
    return app
  }
}

const MESSAGE_RELOGIN: string = '你已被登出，可以取消继续留在该页面，或者重新登录'

function axiosInterceptor(axios: AxiosInstance, store: Store<IRootState>, message: ui.Message, messagebox: ui.MessageBox) {
  if (!axios) {
    return
  }
  axios.interceptors.request.use(
    config => {
      if (store.state.user.token) {
        config.headers['Authorization'] = `Berear ${store.state.user.token}`
        config.headers['X-Access-Token'] = store.state.user.token
      }
      config.headers['X-Ca-Nonce'] = uuid()
      return config
    },
    error => {
      // tslint:disable-next-line: no-floating-promises
      Promise.reject(error)
    }
  )

  axios.interceptors.response.use(
    response => {
      if (response.status !== 200) {
        switch (response.status) {
          case 401:
            if (messagebox) {
              // tslint:disable-next-line: no-floating-promises
              messagebox
                .confirm(MESSAGE_RELOGIN, '确定登出', {
                  confirmButtonText: '重新登录',
                  cancelButtonText: '取消',
                  type: 'warning'
                })
                .then(async () => {
                  await store.dispatch('user/ResetToken')
                  location.reload() // To prevent bugs from vue-router
                })
            }
            break
          case 403:
            if (messagebox) {
              // tslint:disable-next-line: no-floating-promises
              messagebox.alert('您的权限不足', '权限不足', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
              })
            }
            break
        }
      } else {
        let res = response.data
        if (!res.Success) {
          if (message) {
            // tslint:disable-next-line: no-floating-promises
            message.error(res.Message || 'Error')
          }
          return Promise.reject(response.data)
        } else {
          if (res.Message) {
            if (message) {
              // tslint:disable-next-line: no-floating-promises
              message.success(res.Message)
            }
          }
          return response.data
        }
      }
    },
    error => {
      if (message) {
        // tslint:disable-next-line: no-floating-promises
        message.error(error.message || 'Error')
        return Promise.reject(error)
      }
    }
  )
}

function routerInterceptor(router: VueRouter, store: Store<IRootState>, process: ui.Process, message: ui.Message) {
  router.beforeEach(async (to: Route, _: Route, next: any) => {
    if (process) {
      process.start()
    }
    // Determine whether the user has logged in
    if (store.state.user.token) {
      if (to.path === '/login') {
        // If is logged in, redirect to the home page
        next({ path: '/' })
        if (process) {
          process.done()
        }
      } else {
        // Check whether the user has obtained his permission roles
        if (store.state.user.roles.length === 0) {
          try {
            // Note: roles must be a object array! such as: ['admin'] or ['developer', 'editor']
            await store.dispatch('user/GetUserInfo')
            const roles = store.state.user.roles
            // Generate accessible routes map based on role
            await store.dispatch('permission/GenerateRoutes', roles)
            // Dynamically add accessible routes
            router.addRoutes(store.state.permission.dynamic)
            // Hack: ensure addRoutes is complete
            // Set the replace: true, so the navigation will not leave a history record
            next({ ...to, replace: true })
          } catch (err) {
            // Remove token and redirect to login page
            await store.dispatch('user/ResetToken')
            if (message) {
              // tslint:disable-next-line: no-floating-promises
              message.error(err || 'Has Error')
            }
            next(`/login?redirect=${to.path}`)
            if (process) {
              process.done()
            }
          }
        } else {
          next()
        }
      }
    } else {
      // Has no token
      if (to.meta && to.meta.white) {
        // In the free login whitelist, go directly
        next()
      } else {
        // Other pages that do not have permission to access are redirected to the login page.
        next(`/login?redirect=${to.path}`)
        if (process) {
          process.done()
        }
      }
    }
  })

  router.afterEach((to: Route) => {
    if (process) {
      process.done()
    }
  })
}
