import { Dialog } from 'quasar'
import AiChatDialog from 'components/ai-chat-dialog.vue'

export function openAiChatDialog({
  title,
  selectedText = '',
  defaultPrompt = '',
  outputType,
  requestParams
}) {
  return new Promise((resolve, reject) => {
    Dialog.create({
      component: AiChatDialog,
      componentProps: {
        title,
        selectedText,
        defaultPrompt,
        outputType,
        requestParams
      }
    })
    .onOk((draft) => resolve(draft))
    .onCancel(() => reject(new Error('cancelled')))
  })
}
