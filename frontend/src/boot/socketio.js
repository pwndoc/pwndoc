import io from 'socket.io-client'

export default ({ Vue }) => {
    Vue.prototype.$socket = io(`${window.location.protocol}//${window.location.hostname}:${process.env.API_PORT}`);
}  