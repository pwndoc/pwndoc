import { defineRouter } from '#q-app/wrappers'
import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './routes.js'

export default defineRouter(() => {
  const createHistory = process.env.VUE_ROUTER_MODE === 'history'
    ? createWebHistory
    : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  return Router
})