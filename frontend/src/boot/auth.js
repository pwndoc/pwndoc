import User from '@/services/user';

export default ({ app, router, Vue }) => {
  router.beforeEach((to, from, next) => {
    var publicPaths = ['/login'];
    User.checkToken()
    .then(function() {
      (to.path === '/login') ? next('/') : next();
    })
    .catch(function(error) {
        if (publicPaths.indexOf(to.path) > -1)
          next()
        else if (error.response){
          if (error.response.data.datas === 'Invalid token') next('/login?tokenError=1');
          if (error.response.data.datas === 'Expired token') next('/login?tokenError=2');
          else next('/login');
        }
        else
          next('/login');
    })
  })
}