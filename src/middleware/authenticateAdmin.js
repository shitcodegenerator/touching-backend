const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  try {
    // Extract the token from the Authorization header
    const token = req.headers.authorization.split(' ')[1];

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.ADMIN_KEY);

    // Attach the decoded token to the request for further use
    req.userData = { userId: decodedToken.userId, username: decodedToken.username };

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = authenticate;
