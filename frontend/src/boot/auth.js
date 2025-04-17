import { defineBoot } from '#q-app/wrappers'
import UserService from '@/services/user';
import { useUserStore } from '@/stores/user'

export default defineBoot(async({ router, store, urlPath, redirect }) => {
  const userStore = useUserStore(store)
  
  router.beforeEach((to, from, next) => {
    if (to.path === '/login') {
        if (userStore.isLoggedIn)
          next('/')
        else
          next()
      }
      else {
        next()
      }
  })

  // Launch refresh token countdown 840000=14min if not on login page
  setInterval(() => {
    UserService.refreshToken()
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
    await UserService.refreshToken()
  }
  catch(err) {
    if (!urlPath.startsWith('/login'))
      if (err === 'Expired refreshToken')
        redirect('/login?tokenError=2')
      else
        redirect('/login')
  }
})