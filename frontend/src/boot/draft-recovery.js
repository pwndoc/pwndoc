import { defineBoot } from '#q-app/wrappers'
import DraftRecoveryService from '@/services/draft-recovery'

export default defineBoot(async () => {
  await DraftRecoveryService.purgeExpired()
})
