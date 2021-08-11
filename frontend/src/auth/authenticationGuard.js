import { getInstance } from "./index";

export const authenticationGuard = (to, from, next) => {
  const authService = getInstance();
  const guardAction = () => {
    if (authService.isAuthenticated) {
      return next();
    }
    authService.loginWithRedirect({ appState: { targetUrl: to.fullPath } });
  };
  // If the Auth0Plugin has loaded already, check the authentication state
  if (!authService.isLoading) {
    return guardAction();
  }
  authService.$watch("isLoading", (isLoading) => {
    if (isLoading === false) {
      return guardAction();
    }
  });
};
