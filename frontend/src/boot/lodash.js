import { defineBoot } from '#q-app/wrappers';
import Lodash from 'lodash';

export default defineBoot(({ app }) => {
    app.config.globalProperties.$_ = Lodash;
})