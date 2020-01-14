import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: `${window.location.protocol}//${window.location.hostname}:${process.env.API_PORT}/api`
})

export default ({ Vue }) => {
  Vue.prototype.$axios = axiosInstance
}
