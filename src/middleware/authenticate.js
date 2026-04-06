const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/response.js");

const authenticate = (req, res, next) => {
  try {
    // 優先從 cookie 取 token
    let token = req.cookies?.token;

    // fallback: Authorization header
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      return sendError(res, "請提供認證令牌", 401);
    }

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.AUTH_KEY);

    // Validate token payload
    if (!decodedToken.userId || !decodedToken.username) {
      return sendError(res, "認證令牌無效", 401);
    }

    // Attach the decoded token to the request for further use
    req.userData = {
      userId: decodedToken.userId,
      username: decodedToken.username,
    };
    next();
  } catch (error) {
    console.log(error);
    return sendError(res, "您的登入階段已過期，請重新登入", 401);
  }
};

module.exports = authenticate;
