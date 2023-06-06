import { boot } from 'quasar/wrappers'
import io from 'socket.io-client'
import {Loading} from 'quasar'

export default boot(({ app }) => {
    var socket = io(`${window.location.protocol}//${window.location.hostname}:${process.env.API_PORT}`);

    socket.on('disconnect', (error) => {
        Loading.show({
            html: true,
            message: `<i class='material-icons'>wifi_off</i><br /><p>${this.$t('msg.wrongContactingBackend')}</p>`, 
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