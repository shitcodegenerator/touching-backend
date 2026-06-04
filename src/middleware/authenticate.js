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
      return sendError(res, "登入階段過期，請重新登入", 401);
    }

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.AUTH_KEY);

    // Validate token payload
    // 只要求 userId：userId 才是真正身分（簽章已驗證真偽）。
    // username 對驗證無意義，且部分登入路徑（如 FB 未取得 email）會發出無 username 的 token，
    // 若強制要求會把這些已登入使用者擋成 401。
    if (!decodedToken.userId) {
      return sendError(res, "登入階段過期，請重新登入", 401);
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
