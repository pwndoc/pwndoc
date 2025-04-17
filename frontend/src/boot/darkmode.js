import { defineBoot } from '#q-app/wrappers';
import { Dark } from "quasar";

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

export default defineBoot(({ app }) => {
    updateDarkMode(); // initial check

    app.config.globalProperties.$toggleDarkMode = () => {
        updateDarkMode(!Dark.isActive);
    }
})