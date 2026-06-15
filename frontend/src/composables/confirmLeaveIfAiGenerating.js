import { Dialog } from 'quasar'
import { useAiGenerationStore } from '@/stores/ai-generation'
import { $t } from '@/boot/i18n'

function shouldConfirmLeave(store) {
  return store.isGenerating || (store.drawerOpen && store.isActive)
}

function confirmDiscardAiSession(onConfirm) {
  const store = useAiGenerationStore()

  if (!shouldConfirmLeave(store)) {
    onConfirm()
    return
  }

  Dialog.create({
    title: $t('aiChat.leaveWhileGeneratingTitle'),
    message: store.isGenerating ?
      $t('aiChat.leaveWhileGeneratingMessage') :
      $t('aiChat.leaveWhileAiSessionMessage'),
    ok: { label: $t('btn.leave'), color: 'negative' },
    cancel: { label: $t('btn.stay'), color: 'white' },
    focus: 'cancel'
  })
  .onOk(() => {
    store.cancelSession({ force: true })
    onConfirm()
  })
}

export function runAfterAiGenerationCheck(callback) {
  confirmDiscardAiSession(callback)
}

export function confirmRouterLeaveIfAiGenerating(next) {
  const store = useAiGenerationStore()

  if (!shouldConfirmLeave(store)) {
    next()
    return
  }

  Dialog.create({
    title: $t('aiChat.leaveWhileGeneratingTitle'),
    message: store.isGenerating ?
      $t('aiChat.leaveWhileGeneratingMessage') :
      $t('aiChat.leaveWhileAiSessionMessage'),
    ok: { label: $t('btn.leave'), color: 'negative' },
    cancel: { label: $t('btn.stay'), color: 'white' },
    focus: 'cancel'
  })
  .onOk(() => {
    store.cancelSession({ force: true })
    next()
  })
  .onCancel(() => {
    next(false)
  })
}
