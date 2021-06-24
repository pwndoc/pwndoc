import User from '@/services/user';

export default ({ app, router, Vue }) => {
  router.beforeEach((to, from, next) => {
    if (to.path === '/login') {
      User.checkToken()
      .then(() => {
        next('/')
      })
      .catch((error) => {
        next()
      })
    }
    else {
      next()
    }
  })
}