const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.js");
const { sendSuccess, sendError } = require("../utils/response.js");

const register = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return sendError(res, "All fields are required", 400);
  }

  try {
    const existingUser = await Admin.findOne({ username });
    if (existingUser) {
      return sendError(res, "Username is already taken", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new Admin({
      username,
      password: hashedPassword,
    });

    await newUser.save();

    // 移除 password 再回傳
    const userData = newUser.toObject();
    delete userData.password;

    return sendSuccess(res, userData, 201);
  } catch (error) {
    console.error(error);
    return sendError(res, "Internal Server Error", 500);
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return sendError(res, "Username and password are required", 400);
  }

  try {
    const user = await Admin.findOne({ username });

    if (!user) {
      return sendError(res, "Invalid username or password", 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      const token = jwt.sign(
        { username: user.username, userId: user._id },
        process.env.ADMIN_KEY,
        { expiresIn: "7d" },
      );

      return sendSuccess(res, {
        token,
        expiresIn: 3600,
        user: {
          username: user.username,
          email: user.email,
        },
      });
    } else {
      return sendError(res, "Invalid username or password", 401);
    }
  } catch (error) {
    console.error(error);
    return sendError(res, "Internal Server Error", 500);
  }
};

module.exports = {
  register,
  login,
};
