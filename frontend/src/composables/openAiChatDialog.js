import { useAiGenerationStore } from '@/stores/ai-generation'

export function openAiChatDialog({
  title,
  selectedText = '',
  defaultPrompt = '',
  outputType,
  requestParams,
  lockKey = null
}) {
  const store = useAiGenerationStore()
  return store.openSession({
    title,
    selectedText,
    defaultPrompt,
    outputType,
    requestParams,
    lockKey
  })
}
