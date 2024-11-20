import User from '@/services/user';
import {isSSO} from '../config/config.json'

export default async ({ urlPath, router, redirect }) => {
  // Launch refresh token countdown 840000=14min if not on login page
  setInterval(() => {
    User.refreshToken()
      .then()
      .catch(err => {
        //SSO redirection
        if (isSSO) {
          if (!router.currentRoute.path.startsWith('/api/sso'))
            if (err === 'Expired refreshToken')
              redirect('/api/sso?tokenError=2')
            else
              redirect('/api/sso')
        }
        else {
          if (!router.currentRoute.path.startsWith('/login'))
            if (err === 'Expired refreshToken')
              redirect('/login?tokenError=2')
            else
              redirect('/login')
        }
      })
  }, 840000)

  // Call refreshToken when loading app and redirect to login if error
  try {
    await User.refreshToken()
  }
  catch (err) {
    //SSO integration
    if (isSSO) {
      if (!urlPath.startsWith('/api/sso'))
        if (err === 'Expired refreshToken')
          redirect('/api/sso?tokenError=2')
        else
          redirect('/api/sso')
    }
    else {
      if (!urlPath.startsWith('/login'))
        if (err === 'Expired refreshToken')
          redirect('/login?tokenError=2')
        else
          redirect('/login')
    }
  }

  router.beforeEach((to, from, next) => {
    //SSO Integration 
    if (isSSO) {
      if (to.path === '/api/sso') {
        if (User.isAuth())
          next('/')
        else if (true) {
          console.log("router crash")
          next('/api/sso')
        }
      }
      else
        next()
    }
    else {
      if (to.path === '/login') {
        if (User.isAuth())
          next('/')
        else
          next()
      }
      else {
        next()
      }
    }
  }
  )
}