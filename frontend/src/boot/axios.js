import axios from 'axios'
import User from '@/services/user'
import Router from '../router'

const axiosInstance = axios.create({
  baseURL: `${window.location.origin}/api`
})

var refreshPending = false
var requestsQueue = []

// Redirect to login if response is 401 (Unauthenticated)
axiosInstance.interceptors.response.use(
  response => {
    return response
  }, 
  error => {
    const originalRequest = error.config

    // 401 after User.refreshToken function call
    if (error.response.status === 401 && originalRequest.url.endsWith('/users/refreshtoken')) {
      User.clear()
      return Promise.reject(error)
    }

    // 401 after login request
    if (error.response.status === 401 && originalRequest.url.endsWith('/users/token')) {
      return Promise.reject(error)
    }

    // All other 401 calls
    if (error.response.status === 401) {
      if (!refreshPending) {
        refreshPending = true
        axiosInstance.get('/users/refreshtoken')
        .then(() => {
          requestsQueue.forEach(e => e())
          requestsQueue = []
        })
        .catch(err => {
          Router.push('/login')
          return Promise.reject(error)
          
        })
        .finally(() => {
          refreshPending = false
        })
      }
      return new Promise((resolve) => {
        requestsQueue.push(() => resolve(axiosInstance.request(originalRequest)))
      })
    }
    return Promise.reject(error)
  }
)

export default ({ Vue }) => {
  Vue.prototype.$axios = axiosInstance
}
