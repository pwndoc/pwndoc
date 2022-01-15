import io from 'socket.io-client'

const exportedObject = {
    io: null,
    connect: function() {
        if(this.io != null) {
            return;
        }
        this.io = io(`${window.location.protocol}//${window.location.hostname}:${process.env.API_PORT}`);
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