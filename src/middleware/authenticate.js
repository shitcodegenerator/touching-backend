const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  try {
    // Check if Authorization header exists
    if (!req.headers.authorization) {
      return res.status(401).json({ data: false, message: '請提供認證令牌' });
    }

    // Extract the token from the Authorization header
    const authHeader = req.headers.authorization;
    const parts = authHeader.split(' ');
    
    // Check if header format is correct
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ data: false, message: '認證令牌格式錯誤' });
    }

    const token = parts[1];
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({ data: false, message: '認證令牌缺失' });
    }

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.AUTH_KEY);

    // Validate token payload
    if (!decodedToken.userId || !decodedToken.username) {
      return res.status(401).json({ data: false, message: '認證令牌無效' });
    }

    // Attach the decoded token to the request for further use
    req.userData = { userId: decodedToken.userId, username: decodedToken.username };
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ data: false, message: '您的登入階段已過期，請重新登入' });
  }
};

module.exports = authenticate;
