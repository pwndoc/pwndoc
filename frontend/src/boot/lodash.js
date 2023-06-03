import { boot } from 'quasar/wrappers'
import Lodash from 'lodash'

export default boot(({ app }) => {
    app.config.globalProperties.$_ = Lodash
})