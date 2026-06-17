import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
    state: () => ({
      id: "",
      username: "",
      roles: [],
      firstname: "",
      lastname: "",
      email: "",
      phone: "",
      totpEnabled: false,
      permissions: [],
      isLoggedIn: false
    }),
  
    getters: {
      isAllowed: (state) => (scope) => Boolean(
        state.permissions === '*' ||
        state.permissions?.includes(scope) ||
        state.permissions?.includes(`${scope}-all`)
      )
    },
  
    actions: {
      setUser(decodedToken) {
        this.id = decodedToken?.id;
        this.username = decodedToken?.username;
        this.roles = decodedToken?.roles || [];
        this.firstname = decodedToken?.firstname;
        this.lastname = decodedToken?.lastname;
        this.email = decodedToken?.email;
        this.phone = decodedToken?.phone;
        this.totpEnabled = decodedToken?.totpEnabled;
        this.permissions = decodedToken?.permissions || [];
        this.isLoggedIn = true;
      },
  
      clearUser() {
        this.username = "";
        this.roles = [];
        this.firstname = "";
        this.lastname = "";
        this.totpEnabled = false;
        this.permissions = [];
        this.isLoggedIn = false;
      }
    }
  })
