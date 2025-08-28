import { defineBoot } from '#q-app/wrappers'

let routerInstance = null

export default defineBoot(({ router }) => {
  routerInstance = router
})

export { routerInstance }
