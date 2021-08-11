const authConfig = require("../config/auth");
const axios = require("axios");

const getUserInfoFromAuth0 = async (jwtToken) => {
  try {
    const response = await axios.get(
      `https://${authConfig.endpoint}/userinfo`,
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
      }
    );

    return response.data;
  } catch (e) {
    return null;
  }
};

module.exports = { getUserInfoFromAuth0 };
