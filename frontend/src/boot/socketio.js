import io from 'socket.io-client'
import {Loading} from 'quasar'
import { $t } from '@/boot/i18n'

const exportedObject = {
    io: null,
    connect: function() {
        if(this.io != null) {
            return;
        }
        this.io = io(`${window.location.protocol}//${window.location.hostname}:${process.env.API_PORT}`);

        this.io.on('disconnect', (error) => {
            Loading.show({
                message: `<i class='material-icons'>wifi_off</i><br /><p>${$t('msg.wrongContactingBackend')}</p>`, 
                spinner: null, 
                backgroundColor: 'red-10', 
                customClass: 'loading-error',
                delay: 5000
            });
        });

        this.io.on('connect', () => {    
            Loading.hide()
        });
    },
    disconnect: function() {
        if(this.io != null) {
            this.io.disconnect();
            this.io = null;
        }
    }
};

export default ({ Vue }) => {
    Vue.prototype.$socket = exportedObject;
}  