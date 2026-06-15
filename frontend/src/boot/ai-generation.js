import { defineBoot } from '#q-app/wrappers'
import { confirmRouterLeaveIfAiGenerating } from '@/composables/confirmLeaveIfAiGenerating'

export default defineBoot(({ router }) => {
  router.beforeEach((to, from, next) => {
    if (to.path === from.path)
      return next()

    confirmRouterLeaveIfAiGenerating(next)
  })
})
