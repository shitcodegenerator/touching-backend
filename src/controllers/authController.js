const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user.js");
const axios = require("axios");
const nodemailer = require("nodemailer");
const crypto = require('crypto');

function generateResetPasswordToken() {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(buffer.toString('hex'));
      }
    });
  });
}

const register = async (req, res) => {
  const {username, password, ...otherData} = req.body
  try {

    const existingUser = await User.findOne({ username }).select('-password');

    if (existingUser) {
      return res
        .status(400)
        .json({ data: false, message: "會員帳號已有人使用" });
    }

    const newUser = new User({
      username,
      password: password ? await bcrypt.hash(password, 15) : '',
      ...otherData
    });

    await newUser.save();

    const token = jwt.sign(
      { username, userId: newUser._id },
      process.env.AUTH_KEY,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ data: newUser, token });
  } catch (err) {
    console.log(err);
    return res.status(400).json({ data: err.response.data.error_description });
  }
};



const lineLoginHandler = async(reqBody, res) => {
  const data = {
    grant_type: "authorization_code",
    code: reqBody.code,
    client_id: 2004045021,
    client_secret: "076a9cddc12b1ea0e7fe0bc2a1de7281",
    redirect_uri: "https://localhost:3000/login/callback",
  };

  axios.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded"
  try {
    const lineRes = await axios.post("https://api.line.me/oauth2/v2.1/token", data);

    axios.defaults.headers[
      "Authorization"
    ] = `Bearer ${lineRes.data.access_token}`;

    const lineProfileRes = await axios.post("https://api.line.me/v2/profile", {
      client_id: 2004045021,
      id_token: lineRes.data.access_token,
    });

    const userId = lineProfileRes.data.userId;

    const existingUser = await User.findOne({ line_id: userId }).select('-password');
    const userDetail = jwt.decode(lineRes.data.id_token);

    // 已經有會員：登入
    if (existingUser) {
      const token = jwt.sign(
        { username: userDetail.email, userId: existingUser._id },
        process.env.AUTH_KEY,
        { expiresIn: "1h" }
      );

      return res
        .status(200)
        .json({ data: existingUser, message: "登入成功", token });
    }

    // 非會員，註冊
    // if (reqBody.name) {
      console.log('LINE註冊')
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
        { expiresIn: "1h" }
      );
  
      return res.status(200).json({ data: false, message: "註冊成功", token  });
    // }

    return res
        .status(200)
        .json({
          data: false, 
          message: "該Line帳號尚未註冊，正在前往註冊畫面",
          user: {
            line_id: userId,
            name: userDetail.name,
            email: userDetail.email,
            username: userDetail.email,
            avatar: userDetail.pictureUrl,
          }
        }
        );

  } catch(err) {
    console.log(err)
    return res.status(400).json({data: false, message: '註冊失敗，請再試一次。'})
  }
}

const ggg = async(data, done) => {

  // axios.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded"
  try {


    const existingUser = await User.findOne({ google_id: data.id }).select('-password');

    // 已經有會員：登入
    if (existingUser) {
      const token = jwt.sign(
        { username: existingUser.email, userId: existingUser._id },
        process.env.AUTH_KEY,
        { expiresIn: "1h" }
      );
      
      
      return done(null,{ data: existingUser, message: "登入成功", token })
    }



    // 找不到會員？註冊
    const newUser = new User({
      google_id: data.id,
      name: data.displayName,
      email: data._json.email,
      username: data._json.email,
      avatar: data._json.picture
    });

   

    await newUser.save();

    const token = jwt.sign(
      { username: udata._json.email, userId: data.id },
      process.env.AUTH_KEY,
      { expiresIn: "1h" }
    );

    return done(null,{ data: false, message: "註冊成功", token  })
  } catch(err) {
    console.log(err)
    return done(null, {error: true, data: false, message: '註冊失敗，請再試一次。'})
  }
}

const googleLoginHandler = async(code, res) => {

  axios.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded"
  try {
    console.log(code)
    const googleRes = await axios.post(`https://oauth2.googleapis.com/tokeninfo?id_token=${code}`);


    const userId = googleRes.data.sub;
    const avatar = googleRes.data.picture;

    const existingUser = await User.findOne({ google_id: userId }).select('-password');
    const userDetail = googleRes.data

    // 已經有會員：登入
    if (existingUser) {
      const token = jwt.sign(
        { username: userDetail.email, userId: existingUser._id },
        process.env.AUTH_KEY,
        { expiresIn: "1h" }
      );
      console.log(token)
      return res
        .status(200)
        .json({ data: existingUser, message: "登入成功", token });
    }

    // 找不到會員？註冊
    const newUser = new User({
      google_id: userId,
      name: userDetail.name,
      email: userDetail.email,
      username: userDetail.email,
      avatar
    });

   
    await newUser.save();

    const token = jwt.sign(
      { username: userDetail.email, userId: newUser._id },
      process.env.AUTH_KEY,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ data: false, message: "註冊成功", token  });
  } catch(err) {
    // console.log('err', err)
    return res.status(400).json({data: false, message: '註冊失敗，請再試一次。'})
  }
}

const fbLoginHandler = async(reqBody, res) => {

  const { code, name, email } = reqBody

  axios.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded"

  try {
    const existingUser = await User.findOne({ facebook_id: code }).select('-password');
    // 已經有會員：登入
    if (existingUser) {
      const token = jwt.sign(
        { username: email, userId: existingUser._id },
        process.env.AUTH_KEY,
        { expiresIn: "1h" }
      );
      console.log(token)
      return res
        .status(200)
        .json({ data: existingUser, message: "登入成功", token });
    }

    // return res
    // .status(200)
    // .json({
    //   data: false, 
    //   message: "該Facebook帳號尚未註冊，正在前往註冊畫面",
    //   user: {
    //     facebook_id: code,
    //     name,
    //     email,
    //     username: email
    //   }
    // })

    // 找不到會員？註冊
    const newUser = new User({
      facebook_id: code,
      name,
      email,
      username: email
    });

   

    await newUser.save();

    const token = jwt.sign(
      { username: email, userId: newUser._id, secret: '0b27092017f83216a025b5d3a897ffa4' }, // 應用程式密鑰
      process.env.AUTH_KEY,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ data: false, message: "註冊成功", token  });
  } catch(err) {
    console.log(err)
    return res.status(400).json({data: 'NO'})
  }
}


const login = async (req, res) => {
  const type = req.body.type
  console.log(req.body.type, req.body.code)
  if (type === 'line') {
    lineLoginHandler(req.body, res)
  }

  if (type === 'google') {
    googleLoginHandler(req.body.code, res)
  }

  if (type === 'fb') {
    fbLoginHandler(req.body, res)
  }

  if (type === 'account') {
    const hasAccount = await User.findOne({ username: req.body.username })

    if (!hasAccount) {
      return res.status(400).json({data: false, message: '無此會員帳號'})
    }
    const isPasswordValid = await bcrypt.compare(req.body.password, hasAccount.password)
    if (!isPasswordValid) {
      return res.status(400).json({data: false, message: '密碼錯誤，請再試一次'})
    }

     const token = jwt.sign(
      { username: req.body.username, userId: hasAccount._id },
      process.env.AUTH_KEY,
      { expiresIn: "1h" }
    );
    return res
      .status(200)
      .json({ data: hasAccount, message: "登入成功", token });
  }
};

const getUserData = async (req, res) => {
  try {
    // Use the decoded user data from the middleware
    const { userId } = req.userData;

    // Find the user by ID and exclude the password field
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ data: user, message: '查無此用戶' });
    }

    // Return user data
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const editUserData = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(id, { ...updateData, modified_at: new Date() }, { new: true }).select('-password').populate('type');

    if (!updatedUser) {
      return res.status(404).json({ data: false, message: '查無此用戶' });
    }

    // Return user data
    res.status(200).json({ data: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const sendEmail = async (req, res) => {
  const user = await User.findOne({ email: req.body.email })
  console.log(req.body.email)

  if (!user || !req.body.email) {
    return res.status(200).json({ data: false, message: '查無此用戶信箱' });
  }
  // if (user.line_id || user.google_id || user.facebook_id) {
  //   return res.status(200).json({ data: false, message: '請使用第三方平台帳號登入' });
  // }
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'touchingdevelopment.service@gmail.com',
      pass: 'fkzibwzpzgzbedpj',
    },
  });

  await transporter.verify();

  const token = crypto.randomBytes(20).toString('hex');

  user.resetToken = token;
  user.resetExpiration = Date.now() + 3600000
  user.save()
  
  const mailOptions = {
    from: '踏取國際開發有限公司 <touchingdevelopment.service@gmail.com>',
    to: req.body.email,
    subject: `【踏取國際開發】會員密碼重置通知`,
    html: `<p>${user.name} 您好</p><p>您的驗證碼如下，請勿將驗證碼外流予他人：</p>
    ${token}<br/><br/><p>該驗證碼將於 1 小時後失效</p>`
  };


  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(err);
      res.status(500).send({ data: false, message: '發送失敗' });
    } else {
      console.log(info);
      res.status(200).json({data: true, message: '成功發送信件'})
    }
  });
}

const resetPassword = async (req, res) => {
  const { email, token, password } = req.body;
  console.log(req.body)
    const user = await User.findOne({
      email,
      resetToken: token,
      resetExpiration: { $gt: Date.now() } // 检查token是否过期
    });

  if (!user) {
    return res.status(404).json({ data: false, message: '無此用戶或連結失效，請重新再試。' });
  }

  user.password = await bcrypt.hash(password, 15);
  user.resetToken = undefined;
  user.resetExpiration = 0;
  await user.save();


  res.status(200).json({data: true, message: '重新設置密碼成功'})

}

module.exports = {
  register,
  login,
  getUserData,
  sendEmail,
  resetPassword,
  editUserData,
  ggg
};
