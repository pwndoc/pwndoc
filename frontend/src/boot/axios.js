import axios from 'axios'
import User from '@/services/user'
import Router from '../router'
import {isSSO} from '../config/config.json'

const axiosInstance = axios.create({
  baseURL: `${window.location.origin}/api`
})

var refreshPending = false
var requestsQueue = []

var route1 = "";
var route2 = "";


if (isSSO) {
  route1 = '/sso';
  route2 = '/sso';
}
else {
  route1 = '/users/refreshtoken'
  route2 = '/login'
}

// Redirect to login if response is 401 (Unauthenticated)
axiosInstance.interceptors.response.use(
  response => {
    return response
  }, 
  error => {
    const originalRequest = error.config

    // **** 401 exceptions to avoid infinite loop

    // 401 after User.refreshToken function call
    if (error.response.status === 401 && originalRequest.url.endsWith('/users/refreshtoken')) {
      User.clear()
      return Promise.reject(error)
    }

    // 401 after login request
    if (error.response.status === 401 && originalRequest.url.endsWith('/users/token')) {
      return Promise.reject(error)
    }

    // 401 after settings request (needed since it is called on app loading)
    if (error.response.status === 401 && originalRequest.url.endsWith('/settings/public')) {
      return Promise.reject(error)
    }

    // 401 after totp
    if (error.response.status === 401 && originalRequest.url.endsWith('/users/totp')) {
      return Promise.reject(error)
    }

    // 401 after wrong password on profile
    if (error.response.status === 401 && originalRequest.url.endsWith('/users/me')) {
      return Promise.reject(error)
    }

    // **** End of exceptions

    // All other 401 calls
    if (error.response.status === 401) {
      if (!refreshPending) {
        refreshPending = true
        axiosInstance.get(route1)
        .then(() => {
          requestsQueue.forEach(e => e())
          requestsQueue = []
        })
        .catch(err => {
          Router.push(route2)          
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
