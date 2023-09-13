import io from 'socket.io-client'
import {Loading} from 'quasar'
import { $t } from '@/boot/i18n'

export default ({ Vue }) => {
    var socket = io(`${window.location.protocol}//${window.location.hostname}:${window.location.port != '' ? ':'+window.location.port : ''}`);

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

    Vue.prototype.$socket = socket
}  
