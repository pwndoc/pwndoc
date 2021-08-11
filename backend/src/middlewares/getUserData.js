const UserService = require("../services/UserService");

module.exports = async function (req, res, next) {
  if (!req.headers.authorization) {
    next();

    return;
  }
  const jwtToken = req.headers.authorization.split(" ")[1];

  const user = await UserService.getUserInfoFromAuth0(jwtToken);
  console.log({ jwtToken, user });
  // ctx.state.user = { ...ctx.state.user, ...user };

  next();
};
