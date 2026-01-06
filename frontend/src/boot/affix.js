import { defineBoot } from '#q-app/wrappers';
import Sticky from 'vue3-sticky-directive';

export default defineBoot(({ app }) => {
    app.use(Sticky)
})