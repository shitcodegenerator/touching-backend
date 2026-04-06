const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user.js");
const axios = require("axios");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const emailHint = require("../email/subscribealert.js");
const promoteHint = require("../email/promote.js");
const { setTokenCookie, clearTokenCookie } = require("../utils/cookie.js");
const { sendSuccess, sendError } = require("../utils/response.js");

function generateResetPasswordToken() {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(buffer.toString("hex"));
      }
    });
  });
}

const register = async (req, res) => {
  const { username, password, ...otherData } = req.body;
  try {
    const existingUser = await User.findOne({ username }).select("-password");

    if (existingUser) {
      return sendError(res, "會員帳號已有人使用", 400);
    }

    const newUser = new User({
      username,
      password: password ? await bcrypt.hash(password, 15) : "",
      ...otherData,
    });

    await newUser.save();

    const token = jwt.sign(
      { username, userId: newUser._id },
      process.env.AUTH_KEY,
      { expiresIn: "30d" },
    );

    // 將 token 寫入 httpOnly cookie，不再放在 response body
    setTokenCookie(res, token);

    // 移除 password 再回傳
    const userData = newUser.toObject();
    delete userData.password;

    return sendSuccess(res, userData);
  } catch (err) {
    console.log(err);
    return sendError(res, "註冊失敗，請再試一次。", 400);
  }
};

const lineFriendCheck = async (req, res) => {
  try {
    const { code, uri: redirect_uri } = req.body;
    const data = {
      grant_type: "authorization_code",
      code: code,
      client_id: process.env.LINE_CLIENT_ID,
      client_secret: process.env.LINE_CLIENT_SECRET,
      redirect_uri,
    };

    axios.defaults.headers.post["Content-Type"] =
      "application/x-www-form-urlencoded";
    const lineRes = await axios.post(
      "https://api.line.me/oauth2/v2.1/token",
      data,
    );
    axios.defaults.headers["Authorization"] =
      `Bearer ${lineRes.data.access_token}`;
    const friendRes = await axios.get(
      "https://api.line.me/friendship/v1/status",
    );

    return sendSuccess(res, friendRes.data.friendFlag);
  } catch (e) {
    return sendError(res, "LINE查詢失敗", 400);
  }
};

const lineLoginHandler = async (reqBody, res) => {
  const data = {
    grant_type: "authorization_code",
    code: reqBody.code,
    client_id: process.env.LINE_CLIENT_ID,
    client_secret: process.env.LINE_CLIENT_SECRET,
    redirect_uri: "https://touching-dev.com/login/callback",
  };

  axios.defaults.headers.post["Content-Type"] =
    "application/x-www-form-urlencoded";
  try {
    const lineRes = await axios.post(
      "https://api.line.me/oauth2/v2.1/token",
      data,
    );

    axios.defaults.headers["Authorization"] =
      `Bearer ${lineRes.data.access_token}`;

    const lineProfileRes = await axios.post("https://api.line.me/v2/profile", {
      client_id: 2004045021,
      id_token: lineRes.data.access_token,
    });

    const userId = lineProfileRes.data.userId;

    const existingUser = await User.findOne({ line_id: userId }).select(
      "-password",
    );
    const userDetail = jwt.decode(lineRes.data.id_token);

    // 已經有會員：登入
    if (existingUser) {
      const token = jwt.sign(
        { username: userDetail.email, userId: existingUser._id },
        process.env.AUTH_KEY,
        { expiresIn: "30d" },
      );

      setTokenCookie(res, token);
      return sendSuccess(res, existingUser);
    }

    // 非會員，註冊
    console.log("LINE註冊");
    const newUser = new User({
      line_id: userId,
      name: userDetail.name,
      avatar: userDetail.pictureUrl,
      email: userDetail.email,
      username: userDetail.email,
    });

    await newUser.save();

    const token = jwt.sign(
      { username: userDetail.email, userId: newUser._id },
      process.env.AUTH_KEY,
      { expiresIn: "30d" },
    );

    setTokenCookie(res, token);
    return sendSuccess(res, { registered: true, message: "註冊成功" });
  } catch (err) {
    console.log(err);
    return sendError(res, "註冊失敗，請再試一次。", 400);
  }
};

const ggg = async (data, done) => {
  try {
    const existingUser = await User.findOne({ google_id: data.id }).select(
      "-password",
    );

    // 已經有會員：登入
    if (existingUser) {
      const token = jwt.sign(
        { username: existingUser.email, userId: existingUser._id },
        process.env.AUTH_KEY,
        { expiresIn: "30d" },
      );

      return done(null, {
        data: existingUser,
        message: "登入成功",
        token,
      });
    }

    // 找不到會員？註冊
    const newUser = new User({
      google_id: data.id,
      name: data.displayName,
      email: data._json.email,
      username: data._json.email,
      avatar: data._json.picture,
    });

    await newUser.save();

    const token = jwt.sign(
      { username: data._json.email, userId: data.id },
      process.env.AUTH_KEY,
      { expiresIn: "30d" },
    );

    return done(null, { data: false, message: "註冊成功", token });
  } catch (err) {
    console.log(err);
    return done(null, {
      error: true,
      data: false,
      message: "註冊失敗，請再試一次。",
    });
  }
};

const googleLoginHandler = async (code, res) => {
  axios.defaults.headers.post["Content-Type"] =
    "application/x-www-form-urlencoded";
  try {
    const googleRes = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${code}`,
    );

    const userId = googleRes.data.sub;
    const avatar = googleRes.data.picture;

    const existingUser = await User.findOne({ google_id: userId }).select(
      "-password",
    );
    const userDetail = googleRes.data;

    // 已經有會員：登入
    if (existingUser) {
      const token = jwt.sign(
        { username: userDetail.email, userId: existingUser._id },
        process.env.AUTH_KEY,
        { expiresIn: "30d" },
      );

      setTokenCookie(res, token);
      return sendSuccess(res, existingUser);
    }

    // 找不到會員？註冊
    const newUser = new User({
      google_id: userId,
      name: userDetail.name,
      email: userDetail.email,
      username: userDetail.email,
      avatar,
    });

    await newUser.save();

    const token = jwt.sign(
      { username: userDetail.email, userId: newUser._id },
      process.env.AUTH_KEY,
      { expiresIn: "30d" },
    );

    setTokenCookie(res, token);
    return sendSuccess(res, { registered: true, message: "註冊成功" });
  } catch (err) {
    console.log("GoogleError", err);
    return sendError(res, "註冊失敗，請再試一次。", 400);
  }
};

const fbLoginHandler = async (reqBody, res) => {
  const { code, name, email, avatar } = reqBody;

  axios.defaults.headers.post["Content-Type"] =
    "application/x-www-form-urlencoded";

  try {
    const existingUser = await User.findOne({ facebook_id: code }).select(
      "-password",
    );
    // 已經有會員：登入
    if (existingUser) {
      const token = jwt.sign(
        { username: email, userId: existingUser._id },
        process.env.AUTH_KEY,
        { expiresIn: "30d" },
      );

      setTokenCookie(res, token);
      return sendSuccess(res, existingUser);
    }

    // 找不到會員？註冊
    const newUser = new User({
      facebook_id: code,
      facebook_name: name,
      name,
      email,
      avatar,
      username: email,
    });

    await newUser.save();

    const token = jwt.sign(
      { username: email, userId: newUser._id },
      process.env.AUTH_KEY,
      { expiresIn: "30d" },
    );

    setTokenCookie(res, token);
    return sendSuccess(res, { registered: true, message: "註冊成功" });
  } catch (err) {
    console.log(err);
    return sendError(res, "註冊失敗，請再試一次。", 400);
  }
};

const login = async (req, res) => {
  const type = req.body.type;
  console.log(req.body.type, req.body.code);

  if (type === "line") {
    return lineLoginHandler(req.body, res);
  }

  if (type === "google") {
    return googleLoginHandler(req.body.code, res);
  }

  if (type === "fb") {
    return fbLoginHandler(req.body, res);
  }

  if (type === "account") {
    const hasAccount = await User.findOne({ username: req.body.username });

    if (!hasAccount) {
      return sendError(res, "無此會員帳號", 400);
    }
    const isPasswordValid = await bcrypt.compare(
      req.body.password,
      hasAccount.password,
    );
    if (!isPasswordValid) {
      return sendError(res, "密碼錯誤，請再試一次", 400);
    }

    const token = jwt.sign(
      { username: req.body.username, userId: hasAccount._id },
      process.env.AUTH_KEY,
      { expiresIn: "30d" },
    );

    setTokenCookie(res, token);

    // 回傳時排除 password
    const userData = hasAccount.toObject();
    delete userData.password;

    return sendSuccess(res, userData);
  }
};

const logout = (req, res) => {
  clearTokenCookie(res);
  return sendSuccess(res, null);
};

const getUserData = async (req, res) => {
  try {
    const { userId } = req.userData;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return sendError(res, "查無此用戶", 404);
    }

    return sendSuccess(res, user);
  } catch (error) {
    console.error(error);
    return sendError(res, "Internal Server Error", 500);
  }
};

const editUserData = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // 權限檢查：只能修改自己的資料
  if (req.userData.userId !== id) {
    return sendError(res, "無權限修改他人資料", 403);
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { ...updateData, modified_at: new Date() },
      { new: true },
    )
      .select("-password")
      .populate("type");

    if (!updatedUser) {
      return sendError(res, "查無此用戶", 404);
    }

    return sendSuccess(res, updatedUser);
  } catch (error) {
    console.error(error);
    return sendError(res, "Internal Server Error", 500);
  }
};

const sendHintEmail = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  console.log(req.body.email);

  if (!user || !req.body.email) {
    return sendError(res, "查無此用戶信箱", 400);
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "touchingdevelopment.service@gmail.com",
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  await transporter.verify();

  const mailOptions = {
    from: "踏取國際開發有限公司 <touchingdevelopment.service@gmail.com>",
    to: req.body.email,
    subject:
      "【踏取會員通知】不動產分析報告發布囉！專業不動產數據、經濟與房市指標一應俱全！",
    html: emailHint(req.body.email),
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(err);
      return sendError(res, "發送失敗", 500);
    } else {
      console.log(info);
      return sendSuccess(res, true);
    }
  });
};

const sendFBEmail = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  console.log(req.body.email);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "touchingdevelopment.service@gmail.com",
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  await transporter.verify();

  const mailOptions = {
    from: "踏取國際開發有限公司 <touchingdevelopment.service@gmail.com>",
    to: req.body.email,
    subject: "【踏取國際開發】感謝您的申請！開信馬上領取【2024不動產分析報告】",
    html: promoteHint(req.body.email),
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(err);
      return sendError(res, "發送失敗", 500);
    } else {
      console.log(info);
      return sendSuccess(res, true);
    }
  });
};

const sendEmail = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  console.log(req.body.email);

  if (!user || !req.body.email) {
    return sendError(res, "查無此用戶信箱", 404);
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "touchingdevelopment.service@gmail.com",
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  await transporter.verify();

  const token = crypto.randomBytes(4).toString("hex").toUpperCase();

  user.resetToken = token;
  user.resetExpiration = Date.now() + 3600000;
  await user.save();

  const mailOptions = {
    from: "踏取國際開發有限公司 <touchingdevelopment.service@gmail.com>",
    to: req.body.email,
    subject: "【踏取國際開發】會員密碼重置通知",
    html: `<p>${user.name} 您好</p><p>您的驗證碼如下，請勿將驗證碼外流予他人：</p>
    ${token}<br/><br/><p>該驗證碼將於 1 小時後失效</p>`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(err);
      return sendError(res, "發送失敗", 500);
    } else {
      console.log(info);
      return sendSuccess(res, true);
    }
  });
};

const resetPassword = async (req, res) => {
  const { email, token, password } = req.body;
  console.log(req.body);
  const user = await User.findOne({
    email,
    resetToken: token,
    resetExpiration: { $gt: Date.now() },
  });

  if (!user) {
    return sendError(res, "無此用戶或連結失效，請重新再試。", 404);
  }

  user.password = await bcrypt.hash(password, 15);
  user.resetToken = undefined;
  user.resetExpiration = 0;
  await user.save();

  return sendSuccess(res, true);
};

const sendNow = async () => {
  return;
};

module.exports = {
  register,
  login,
  logout,
  getUserData,
  sendEmail,
  resetPassword,
  editUserData,
  ggg,
  lineFriendCheck,
  sendHintEmail,
};
