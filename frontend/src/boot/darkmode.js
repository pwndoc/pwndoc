import Vue from "vue";
import { Dark } from "quasar";

const DarkModeSwitcher = {
    install: function(Vue) {
        Vue.prototype.toggleDarkMode = function() {
            updateDarkMode(!Dark.isActive);
        }
    }
};
Vue.use(DarkModeSwitcher);

function updateDarkMode(dark = null) {
    // using !! to convert it to a boolean is ok in this case,
    // because we are checking, if the key exists
    let darkmode = !!localStorage.getItem("darkmodeEnabled") || false;
    if(dark != null) {
        // set mode
        darkmode = dark;
    }
    
    Dark.set(darkmode);
    if(darkmode) {
      localStorage.setItem("darkmodeEnabled", "y");
    } else {
      localStorage.removeItem("darkmodeEnabled");
    }
}

updateDarkMode();