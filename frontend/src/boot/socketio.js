import { defineBoot } from '#q-app/wrappers';
import io from 'socket.io-client'
import { Loading } from 'quasar'
import { $t } from '@/boot/i18n'

export default defineBoot(({ app }) => {
    const socketUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;

    const socket = io(socketUrl);

    socket.on('disconnect', (error) => {
        Loading.show({
            message: `<i class='material-icons'>wifi_off</i><br /><p>${$t('msg.wrongContactingBackend')}</p>`, 
            spinner: null, 
            backgroundColor: 'red-10', 
            customClass: 'loading-error',
            delay: 5000
        })
    })
    socket.on('connect', () => {    
        Loading.hide()
    })

    app.config.globalProperties.$socket = socket
})
