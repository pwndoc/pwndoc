import axios from 'axios'
import User from '@/services/user'

const axiosInstance = axios.create({
  baseURL: `${window.location.origin}/api`
})

export default ({ Vue }) => {

  // Redirect to login if response is 401 (Unauthenticated)
  axiosInstance.interceptors.response.use(response => {
    return response
  }, error => {
   if (error.response.status === 401) {
     if (window.location.pathname !== '/login')
      window.location = '/login'
   }
  return error
  })

  Vue.prototype.$axios = axiosInstance
  User.refreshToken()
}
