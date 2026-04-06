const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/response.js");

const authenticateAdmin = (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return sendError(res, "請提供管理員認證令牌", 401);
    }

    const parts = req.headers.authorization.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return sendError(res, "認證令牌格式錯誤", 401);
    }

    const token = parts[1];
    if (!token) {
      return sendError(res, "認證令牌缺失", 401);
    }

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.ADMIN_KEY);

    // Attach the decoded token to the request for further use
    req.userData = {
      userId: decodedToken.userId,
      username: decodedToken.username,
    };

    next();
  } catch (error) {
    return sendError(res, "管理員認證失敗", 401);
  }
};

module.exports = authenticateAdmin;
