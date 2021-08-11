/**
 *  External Modules
 */

import Vue from "vue";
import createAuth0Client from "@auth0/auth0-spa-js";

/**
 *  Vue.js Instance Definition
 */

let instance;

export const getInstance = () => instance;

/**
 *  Vue.js Instance Initialization
 */

export const useAuth0 = ({
  onRedirectCallback = () =>
    window.history.replaceState({}, document.title, window.location.pathname),
  redirectUri = window.location.origin,
  ...pluginOptions
}) => {
  if (instance) return instance;

  instance = new Vue({
    data() {
      return {
        auth0Client: null,
        isLoading: true,
        isAuthenticated: false,
        user: {},
        error: null,
      };
    },
    methods: {
      async handleRedirectCallback() {
        this.isLoading = true;
        try {
          await this.auth0Client.handleRedirectCallback();
          this.user = await this.auth0Client.getUser();
          this.isAuthenticated = true;
        } catch (error) {
          this.error = error;
        } finally {
          this.isLoading = false;
        }
      },

      loginWithRedirect(options) {
        return this.auth0Client.loginWithRedirect(options);
      },

      logout(options) {
        return this.auth0Client.logout(options);
      },

      getTokenSilently(o) {
        return this.auth0Client.getTokenSilently(o);
      },
    },

    async created() {
      this.auth0Client = await createAuth0Client({
        ...pluginOptions,
        domain: pluginOptions.domain,
        client_id: pluginOptions.clientId,
        audience: pluginOptions.audience,
        redirect_uri: redirectUri,
      });

      try {
        if (
          window.location.search.includes("code=") &&
          window.location.search.includes("state=")
        ) {
          const { appState } = await this.auth0Client.handleRedirectCallback();

          onRedirectCallback(appState);
        }
      } catch (error) {
        this.error = error;
      } finally {
        this.isAuthenticated = await this.auth0Client.isAuthenticated();
        if (this.isAuthenticated) {
          this.user = await this.auth0Client.getUser();

          const token = await this.auth0Client.getTokenSilently();
          Vue.prototype.$axios.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${token}`;
        }
        this.isLoading = false;
      }
    },
  });

  return instance;
};

/**
 *  Vue.js Plugin Definition
 */

export const Auth0Plugin = {
  install(Vue, options) {
    Vue.prototype.$auth = useAuth0(options);
  },
};
