const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.js");
const { sendSuccess, sendError } = require("../utils/response.js");
const { decryptPassword } = require("../utils/crypto.js");

const register = async (req, res) => {
  const { username, password, encrypted } = req.body;

  if (!username || !password) {
    return sendError(res, "All fields are required", 400);
  }

  try {
    // 如果前端標記為加密，則解密密碼
    const rawPassword = encrypted ? decryptPassword(password) : password;

    const existingUser = await Admin.findOne({ username });
    if (existingUser) {
      return sendError(res, "Username is already taken", 400);
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

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
  const { username, password, encrypted } = req.body;

  if (!username || !password) {
    return sendError(res, "Username and password are required", 400);
  }

  try {
    // 如果前端標記為加密，則解密密碼
    let rawPassword;
    try {
      rawPassword = encrypted ? decryptPassword(password) : password;
    } catch (decryptErr) {
      console.error("[login] 密碼解密失敗:", decryptErr.message);
      return sendError(res, `密碼解密失敗: ${decryptErr.message}`, 400);
    }

    const user = await Admin.findOne({ username });

    if (!user) {
      return sendError(res, "Invalid username or password", 401);
    }

    const passwordMatch = await bcrypt.compare(rawPassword, user.password);

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
    console.error("[login] 錯誤:", error.message);
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  register,
  login,
};
