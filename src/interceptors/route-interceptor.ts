import { Route } from 'vue-router'
import { RouteInterceptContext } from './route-intercept-context'

export class RouteInterceptor {
  public intercept(context: RouteInterceptContext) {
    context.router.beforeEach(async (to: Route, _: Route, next: any) => {
      if (context.process) {
        context.process.start()
      }
      if (context.store.state.user.token) {
        if (to.path === '/login') {
          next({ path: '/' })
          if (context.process) {
            context.process.done()
          }
        } else {
          if (context.store.state.user.roles.length === 0) {
            try {
              await context.store.dispatch('user/GetUserInfo')
              const roles = context.store.state.user.roles
              await context.store.dispatch('permission/GenerateRoutes', roles)
              context.router.addRoutes(context.store.state.permission.dynamic)
              next({ ...to, replace: true })
            } catch (err) {
              await context.store.dispatch('user/ResetToken')
              if (context.message) {
                // tslint:disable-next-line: no-floating-promises
                context.message.error(err || 'Has Error')
              }
              next(`/login?redirect=${to.path}`)
              if (context.process) {
                context.process.done()
              }
            }
          } else {
            next()
          }
        }
      } else {
        if (to.meta && to.meta.white) {
          next()
        } else {
          next(`/login?redirect=${to.path}`)
          if (context.process) {
            context.process.done()
          }
        }
      }
    })

    context.router.afterEach((to: Route) => {
      if (context.process) {
        context.process.done()
      }
    })
  }
}
