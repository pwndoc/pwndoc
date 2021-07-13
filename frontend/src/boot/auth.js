import User from '@/services/user';

export default async ({ urlPath, router, redirect }) => {
  // Launch refresh token countdown 840000=14min if not on login page
  setInterval(() => {
    User.refreshToken()
    .then()
    .catch(err => {
      if (!router.currentRoute.path.startsWith('/login'))
        if (err === 'Expired refreshToken')
          redirect('/login?tokenError=2')
        else
          redirect('/login')
    })
  }, 840000)

  // Call refreshToken when loading app and redirect to login if error
  try {
    await User.refreshToken()
  }
  catch(err) {
    if (!urlPath.startsWith('/login'))
      if (err === 'Expired refreshToken')
        redirect('/login?tokenError=2')
      else
        redirect('/login')
  }

  router.beforeEach((to, from, next) => {
    if (to.path === '/login') {
      if (User.isAuth())
        next('/')
      else
        next()
    }
    else {
      next()
    }
  })
}