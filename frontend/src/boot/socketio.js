import io from 'socket.io-client'
import {Loading} from 'quasar'
import { $t } from '@/boot/i18n'

export default ({ Vue }) => {
    var socketUrl = `${window.location.protocol}//${window.location.hostname}`;
    if (process.env.API_PORT) {
       socketUrl = socketUrl + ":" + process.env.API_PORT;
    } else if (window.location.port) {
       socketUrl = socketUrl + ":" + window.location.port;
    }

    var socket = io(socketUrl);

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
