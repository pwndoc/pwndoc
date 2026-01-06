import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
    state: () => ({
      id: "",
      username: "",
      role: "",
      firstname: "",
      lastname: "",
      email: "",
      phone: "",
      totpEnabled: false,
      roles: "",
      isLoggedIn: false
    }),
  
    getters: {
      isAllowed: (state) => (role) => Boolean(
        state.roles?.includes(role) ||
        state.roles?.includes(`${role}-all`) ||
        state.roles === '*'
      )
    },
  
    actions: {
      setUser(decodedToken) {
        this.id = decodedToken?.id;
        this.username = decodedToken?.username;
        this.role = decodedToken?.role;
        this.firstname = decodedToken?.firstname;
        this.lastname = decodedToken?.lastname;
        this.email = decodedToken?.email;
        this.phone = decodedToken?.phone;
        this.totpEnabled = decodedToken?.totpEnabled;
        this.roles = decodedToken?.roles;
        this.isLoggedIn = true;
      },
  
      clearUser() {
        this.username = "";
        this.role = "";
        this.firstname = "";
        this.lastname = "";
        this.totpEnabled = false;
        this.roles = "";
        this.isLoggedIn = false;
      }
    }
  })